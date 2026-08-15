import { describe, expect, it } from "vitest";

import {
  APPLICATION_CALENDAR_TIME_ZONE,
  resolveApplicationDateKey,
  shiftCalendarDate,
  type CalendarDateKey,
} from "@/lib/history-calendar";
import type { DailyEnergySnapshotInput } from "@/lib/history-types";
import { DeviceService } from "@/lib/services/device-service";
import { EnergyHistoryService } from "@/lib/services/energy-history-service";
import {
  createDemoDeviceRecords,
  InMemoryDeviceRepository,
  OTHER_USER_ID,
  TEST_USER_ID,
} from "@/tests/device-test-helpers";
import { InMemoryEnergyHistoryRepository } from "@/tests/history-test-helpers";

const referenceInstant = new Date("2026-08-10T15:00:00.000Z");
const referenceDate = "2026-08-10" as const;

async function getDevices(userId = TEST_USER_ID) {
  return new DeviceService(
    new InMemoryDeviceRepository(createDemoDeviceRecords(userId)),
  ).listDevices(userId);
}

function createSnapshotInput(
  totalConsumptionKwh: number,
  tariffBrlPerKwh = 1,
  deviceName = "Dispositivo histórico",
): DailyEnergySnapshotInput {
  return {
    totalConsumptionKwh,
    estimatedCost: totalConsumptionKwh * tariffBrlPerKwh,
    activeDeviceCount: 1,
    tariffBrlPerKwh,
    devices: [
      {
        deviceId: "historical-device",
        deviceNameSnapshot: deviceName,
        estimatedConsumptionKwh: totalConsumptionKwh,
        estimatedCost: totalConsumptionKwh * tariffBrlPerKwh,
        active: true,
      },
    ],
  };
}

async function seedRange(
  repository: InMemoryEnergyHistoryRepository,
  endDate: CalendarDateKey,
  days: number,
  userId = TEST_USER_ID,
) {
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = shiftCalendarDate(endDate, -offset);
    await repository.upsertDailySnapshot(
      userId,
      date,
      createSnapshotInput(offset + 1),
    );
  }
}

describe("histórico energético persistente", () => {
  it("resolve o dia civil em America/Sao_Paulo na virada UTC", () => {
    expect(APPLICATION_CALENDAR_TIME_ZONE).toBe("America/Sao_Paulo");
    expect(
      resolveApplicationDateKey(
        new Date("2026-08-11T02:59:59.999Z"),
      ),
    ).toBe("2026-08-10");
    expect(
      resolveApplicationDateKey(
        new Date("2026-08-11T03:00:00.000Z"),
      ),
    ).toBe("2026-08-11");
  });

  it("cria o primeiro snapshot diário com detalhe por dispositivo", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();

    const snapshot = await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      0.92,
      referenceInstant,
    );

    expect(snapshot.snapshotDate).toBe(referenceDate);
    expect(snapshot.userId).toBe(TEST_USER_ID);
    expect(snapshot.devices).toHaveLength(devices.length);
    expect(snapshot.totalConsumptionKwh).toBeGreaterThan(0);
    expect(snapshot.estimatedCost).toBeCloseTo(
      snapshot.totalConsumptionKwh * 0.92,
      2,
    );
  });

  it("faz upsert no segundo acesso do mesmo dia sem duplicar", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();

    await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      0.92,
      referenceInstant,
    );
    await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1.1,
      referenceInstant,
    );

    expect(repository.getAll(TEST_USER_ID)).toHaveLength(1);
    expect(repository.getAll(TEST_USER_ID)[0].tariffBrlPerKwh).toBe(1.1);
    expect(repository.upsertCalls).toHaveLength(2);
  });

  it("altera somente o snapshot atual quando o cadastro muda", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();
    const yesterdayInstant = new Date("2026-08-09T15:00:00.000Z");

    const yesterday = await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1,
      yesterdayInstant,
    );
    await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1,
      referenceInstant,
    );
    await service.captureCurrentDay(
      TEST_USER_ID,
      devices.map((device, index) =>
        index === 0
          ? { ...device, powerWatts: device.powerWatts * 2 }
          : device,
      ),
      1,
      referenceInstant,
    );

    expect(
      (await repository.findByDate(TEST_USER_ID, "2026-08-09"))
        ?.totalConsumptionKwh,
    ).toBe(yesterday.totalConsumptionKwh);
    expect(
      (await repository.findByDate(TEST_USER_ID, referenceDate))
        ?.totalConsumptionKwh,
    ).not.toBe(yesterday.totalConsumptionKwh);
  });

  it("isola consultas e gravações por userId", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await repository.upsertDailySnapshot(
      TEST_USER_ID,
      referenceDate,
      createSnapshotInput(3),
    );
    await repository.upsertDailySnapshot(
      OTHER_USER_ID,
      referenceDate,
      createSnapshotInput(9),
    );

    expect(
      (await repository.findByDate(TEST_USER_ID, referenceDate))
        ?.totalConsumptionKwh,
    ).toBe(3);
    expect(
      (await repository.findByDate(OTHER_USER_ID, referenceDate))
        ?.totalConsumptionKwh,
    ).toBe(9);
    expect(repository.getAll(TEST_USER_ID)).toHaveLength(1);
  });

  it("recupera o snapshot mais recente da conta sem misturar usuários", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await repository.upsertDailySnapshot(
      TEST_USER_ID,
      "2026-08-09",
      createSnapshotInput(3, 1.25),
    );
    await repository.upsertDailySnapshot(
      TEST_USER_ID,
      referenceDate,
      createSnapshotInput(3, 5),
    );
    await repository.upsertDailySnapshot(
      OTHER_USER_ID,
      "2026-08-11",
      createSnapshotInput(3, 9),
    );

    await expect(repository.findLatest(TEST_USER_ID)).resolves.toEqual(
      expect.objectContaining({
        snapshotDate: referenceDate,
        tariffBrlPerKwh: 5,
      }),
    );
  });

  it("cria um novo snapshot na virada do dia", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();

    await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1,
      new Date("2026-08-11T02:59:59.999Z"),
    );
    await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1,
      new Date("2026-08-11T03:00:00.000Z"),
    );

    expect(
      repository
        .getAll(TEST_USER_ID)
        .map((snapshot) => snapshot.snapshotDate),
    ).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("mantém Hoje × Ontem indisponível sem snapshot anterior", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await repository.upsertDailySnapshot(
      TEST_USER_ID,
      referenceDate,
      createSnapshotInput(4),
    );
    const period = await new EnergyHistoryService(repository).getPeriod(
      TEST_USER_ID,
      "today",
      referenceInstant,
    );

    expect(period.coverage.currentComplete).toBe(true);
    expect(period.coverage.previousComplete).toBe(false);
    expect(period.coverage.comparisonAvailable).toBe(false);
  });

  it("habilita Hoje × Ontem quando os dois dias existem", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await seedRange(repository, referenceDate, 2);
    const period = await new EnergyHistoryService(repository).getPeriod(
      TEST_USER_ID,
      "today",
      referenceInstant,
    );

    expect(period.current.map((item) => item.snapshotDate)).toEqual([
      referenceDate,
    ]);
    expect(period.previous.map((item) => item.snapshotDate)).toEqual([
      "2026-08-09",
    ]);
    expect(period.coverage.comparisonAvailable).toBe(true);
  });

  it("reconhece cobertura completa de 7 dias nos dois intervalos", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await seedRange(repository, referenceDate, 14);

    const period = await new EnergyHistoryService(repository).getPeriod(
      TEST_USER_ID,
      "7d",
      referenceInstant,
    );

    expect(period.current).toHaveLength(7);
    expect(period.previous).toHaveLength(7);
    expect(period.coverage.comparisonAvailable).toBe(true);
  });

  it("identifica 7 dias parciais sem fabricar dias ausentes como zero", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await repository.upsertDailySnapshot(
      TEST_USER_ID,
      "2026-08-06",
      createSnapshotInput(2),
    );
    await repository.upsertDailySnapshot(
      TEST_USER_ID,
      referenceDate,
      createSnapshotInput(5),
    );

    const period = await new EnergyHistoryService(repository).getPeriod(
      TEST_USER_ID,
      "7d",
      referenceInstant,
    );

    expect(period.current).toHaveLength(2);
    expect(period.current.map((item) => item.totalConsumptionKwh)).toEqual([
      2, 5,
    ]);
    expect(period.coverage.currentComplete).toBe(false);
    expect(period.coverage.comparisonAvailable).toBe(false);
  });

  it("reconhece cobertura completa de 30 dias nos dois intervalos", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await seedRange(repository, referenceDate, 60);

    const period = await new EnergyHistoryService(repository).getPeriod(
      TEST_USER_ID,
      "30d",
      referenceInstant,
    );

    expect(period.current).toHaveLength(30);
    expect(period.previous).toHaveLength(30);
    expect(period.coverage.comparisonAvailable).toBe(true);
  });

  it("identifica 30 dias parciais", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    await seedRange(repository, referenceDate, 12);

    const period = await new EnergyHistoryService(repository).getPeriod(
      TEST_USER_ID,
      "30d",
      referenceInstant,
    );

    expect(period.current).toHaveLength(12);
    expect(period.coverage.currentComplete).toBe(false);
    expect(period.coverage.comparisonAvailable).toBe(false);
  });

  it("preserva a tarifa e o custo estimado armazenados em cada dia", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();

    const snapshot = await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1.37,
      referenceInstant,
    );

    expect(snapshot.tariffBrlPerKwh).toBe(1.37);
    expect(snapshot.estimatedCost).toBeCloseTo(
      snapshot.totalConsumptionKwh * 1.37,
      2,
    );
    const detailedCost = snapshot.devices.reduce(
      (total, device) => total + device.estimatedCost,
      0,
    );
    expect(
      Math.abs(detailedCost - snapshot.estimatedCost),
    ).toBeLessThanOrEqual(snapshot.devices.length * 0.01);
  });

  it("excluir ou renomear hoje não altera o nome do snapshot passado", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();
    const originalName = devices[0].name;

    await service.captureCurrentDay(
      TEST_USER_ID,
      devices,
      1,
      new Date("2026-08-09T15:00:00.000Z"),
    );
    await service.captureCurrentDay(
      TEST_USER_ID,
      devices.slice(0, -1).map((device, index) =>
        index === 0 ? { ...device, name: "Nome atualizado" } : device,
      ),
      1,
      referenceInstant,
    );

    const yesterday = await repository.findByDate(
      TEST_USER_ID,
      "2026-08-09",
    );
    expect(yesterday?.devices[0].deviceNameSnapshot).toBe(originalName);
    expect(yesterday?.devices).toHaveLength(devices.length);
  });

  it("refresh repetido permanece limitado a um agregado por dia", async () => {
    const repository = new InMemoryEnergyHistoryRepository();
    const service = new EnergyHistoryService(repository);
    const devices = await getDevices();

    await Promise.all(
      Array.from({ length: 10 }, () =>
        service.captureCurrentDay(
          TEST_USER_ID,
          devices,
          1,
          referenceInstant,
        ),
      ),
    );

    expect(repository.getAll(TEST_USER_ID)).toHaveLength(1);
  });
});

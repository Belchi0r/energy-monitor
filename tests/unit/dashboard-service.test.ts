import { describe, expect, it, vi } from "vitest";

import { dashboardDatasets } from "@/lib/dashboard/datasets";
import type {
  DashboardDataset,
  DashboardDatasetId,
  DashboardPeriod,
} from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";
import { shiftCalendarDate } from "@/lib/history-calendar";
import { DashboardService } from "@/lib/services/dashboard-service";
import { DeviceService } from "@/lib/services/device-service";
import { EnergyHistoryService } from "@/lib/services/energy-history-service";
import {
  createDemoDeviceRecords,
  InMemoryDeviceRepository,
  OTHER_USER_ID,
  TEST_USER_ID,
} from "@/tests/device-test-helpers";
import { InMemoryEnergyHistoryRepository } from "@/tests/history-test-helpers";

const HISTORY_INSTANT = new Date("2026-08-10T15:00:00.000Z");

class RecordingDashboardRepository implements DashboardRepository {
  readonly calls: DashboardDatasetId[] = [];

  constructor(
    private readonly datasets: Readonly<
      Record<DashboardDatasetId, DashboardDataset>
    > = dashboardDatasets,
  ) {}

  async getDataset(id: DashboardDatasetId) {
    this.calls.push(id);
    return this.datasets[id];
  }
}

function createSubject(
  deviceRepository = new InMemoryDeviceRepository(),
) {
  const repository = new RecordingDashboardRepository();
  const service = new DashboardService(
    repository,
    new DeviceService(deviceRepository),
  );

  return { repository, service };
}

function createHistorySubject(
  historyRepository = new InMemoryEnergyHistoryRepository(),
  deviceRepository = new InMemoryDeviceRepository(),
) {
  const repository = new RecordingDashboardRepository();
  const deviceService = new DeviceService(deviceRepository);
  const historyService = new EnergyHistoryService(historyRepository);
  const service = new DashboardService(
    repository,
    deviceService,
    historyService,
    () => HISTORY_INSTANT,
  );

  return {
    repository,
    deviceService,
    historyRepository,
    historyService,
    service,
  };
}

describe("DashboardService", () => {
  it("usa somente os dispositivos do usuário em home Hoje", async () => {
    const { repository, service } = createSubject();

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      TEST_USER_ID,
    );

    expect(repository.calls).toEqual([]);
    expect(result).toEqual(
      expect.objectContaining({
        mode: "home",
        dataOrigin: "user-devices",
        comparisonAvailable: false,
        historyAvailable: false,
        emptyState: null,
        activities: [],
      }),
    );
    expect(result.timeline.items).toEqual([]);
    expect(result.deviceAnalysis.items).toHaveLength(5);
    expect(
      result.alerts.every(
        (alert) =>
          alert.source === "advisor" &&
          alert.dataOrigin === "estimated",
      ),
    ).toBe(true);
  });

  it("não usa ontem simulado na comparação residencial", async () => {
    const { repository, service } = createSubject();

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: true },
      TEST_USER_ID,
    );

    expect(repository.calls).toEqual([]);
    expect(result.compare).toBe(false);
    expect(result.comparisonAvailable).toBe(false);
    expect(result.previousLabel).toBeUndefined();
    expect(result.temporalAnalysis.previousTotalKwh).toBeUndefined();
    expect(
      result.metrics.every((metric) => metric.comparison === undefined),
    ).toBe(true);
  });

  it("retorna onboarding e conteúdo vazio para usuário sem dispositivos", async () => {
    const { repository, service } = createSubject(
      new InMemoryDeviceRepository([]),
    );

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      TEST_USER_ID,
    );
    const serialized = JSON.stringify(result);

    expect(repository.calls).toEqual([]);
    expect(result.emptyState).toEqual({
      kind: "no-devices",
      title: "Comece cadastrando seu primeiro dispositivo",
      description:
        "Adicione os equipamentos da sua residência para gerar estimativas de consumo, custo e recomendações.",
    });
    expect(result.activities).toEqual([]);
    expect(result.timeline.items).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.temporalAnalysis.points).toEqual([]);
    expect(result.deviceAnalysis.items).toEqual([]);
    expect(result.metrics.every((metric) => metric.value === 0)).toBe(true);
    expect(serialized).not.toMatch(/Ar-condicionado|Geladeira|Chuveiro/);
  });

  it.each(["7d", "30d"] as const)(
    "não consulta nem exibe datasets globais em home %s",
    async (period) => {
      const { repository, service } = createSubject();

      const result = await service.getDashboard(
        { mode: "home", period, compare: true },
        TEST_USER_ID,
      );

      expect(repository.calls).toEqual([]);
      expect(result.emptyState).toEqual(
        expect.objectContaining({
          kind: "historical-unavailable",
          title:
            "Ainda não há histórico estimado neste período.",
        }),
      );
      expect(result.metrics).toEqual([]);
      expect(result.temporalAnalysis.points).toEqual([]);
      expect(result.deviceAnalysis.items).toEqual([]);
      expect(result.alerts).toEqual([]);
      expect(result.timeline.items).toEqual([]);
      expect(result.activities).toEqual([]);
      expect(result.compare).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(
        /Ar-condicionado|Geladeira|Chuveiro/,
      );
    },
  );

  it.each(["today", "7d", "30d"] as const)(
    "carrega somente os datasets globais em demo %s",
    async (period: DashboardPeriod) => {
      const repository = new RecordingDashboardRepository();
      const service = new DashboardService(repository, {
        listDevices: async () => {
          throw new Error("demo não deve consultar dispositivos reais");
        },
      });

      const result = await service.getDashboard(
        { mode: "demo", period, compare: false },
        TEST_USER_ID,
      );

      expect(result.mode).toBe("demo");
      expect(result.dataOrigin).toBe("global-demo");
      expect(result.deviceDataSource).toBe("simulated-snapshot");
      expect(result.emptyState).toBeNull();
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(
        result.alerts.every(
          (alert) => alert.dataOrigin === "simulated",
        ),
      ).toBe(true);
      expect(repository.calls).toEqual(
        period === "today"
          ? ["today"]
          : period === "7d"
            ? ["last7Days", "previous7Days"]
            : ["last30Days", "previous30Days"],
      );
    },
  );

  it("preserva a comparação demonstrativa com datasets globais", async () => {
    const repository = new RecordingDashboardRepository();
    const service = new DashboardService(repository, {
      listDevices: async () => [],
    });

    const result = await service.getDashboard(
      { mode: "demo", period: "today", compare: true },
      TEST_USER_ID,
    );

    expect(repository.calls).toEqual(["today", "yesterday"]);
    expect(result.compare).toBe(true);
    expect(result.comparisonAvailable).toBe(true);
    expect(result.previousLabel).toBe("Ontem");
    expect(result.temporalAnalysis.previousTotalKwh).toBeDefined();
  });

  it("grava Hoje sem inventar Ontem quando o histórico anterior não existe", async () => {
    const { historyRepository, repository, service } =
      createHistorySubject();

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: true },
      TEST_USER_ID,
      0.92,
    );

    expect(repository.calls).toEqual([]);
    expect(historyRepository.getAll(TEST_USER_ID)).toHaveLength(1);
    expect(historyRepository.upsertCalls).toEqual([
      { userId: TEST_USER_ID, snapshotDate: "2026-08-10" },
    ]);
    expect(result.historyCoverage).toEqual(
      expect.objectContaining({
        currentAvailableDays: 1,
        previousAvailableDays: 0,
        currentComplete: true,
        previousComplete: false,
        comparisonAvailable: false,
      }),
    );
    expect(result.compare).toBe(false);
    expect(result.previousLabel).toBeUndefined();
  });

  it("compara Hoje com o snapshot persistido de Ontem", async () => {
    const subject = createHistorySubject();
    const devices = await subject.deviceService.listDevices(TEST_USER_ID);
    const yesterday = await subject.historyService.captureCurrentDay(
      TEST_USER_ID,
      devices.map((device) => ({
        ...device,
        powerWatts: device.powerWatts / 2,
      })),
      0.92,
      new Date("2026-08-09T15:00:00.000Z"),
    );

    const result = await subject.service.getDashboard(
      { mode: "home", period: "today", compare: true },
      TEST_USER_ID,
      0.92,
    );

    expect(result.compare).toBe(true);
    expect(result.comparisonAvailable).toBe(true);
    expect(result.previousLabel).toBe("Ontem (histórico estimado)");
    expect(result.temporalAnalysis.previousTotalKwh).toBe(
      yesterday.totalConsumptionKwh,
    );
    expect(
      result.metrics.find(
        (metric) => metric.id === "periodConsumption",
      )?.comparison?.previousValue,
    ).toBe(yesterday.totalConsumptionKwh);
    expect(
      result.metrics.find((metric) => metric.id === "estimatedCost")
        ?.comparison?.previousValue,
    ).toBe(yesterday.estimatedCost);
  });

  it("mantém 7 dias parciais sem preencher ausências com zero", async () => {
    const subject = createHistorySubject();
    const devices = await subject.deviceService.listDevices(TEST_USER_ID);
    const seeded = await Promise.all(
      ["2026-08-06", "2026-08-08"].map((date) =>
        subject.historyService.captureCurrentDay(
          TEST_USER_ID,
          devices,
          1,
          new Date(`${date}T15:00:00.000Z`),
        ),
      ),
    );

    const result = await subject.service.getDashboard(
      { mode: "home", period: "7d", compare: true },
      TEST_USER_ID,
      1,
    );
    const currentSnapshots = subject.historyRepository
      .getAll(TEST_USER_ID)
      .filter((snapshot) => snapshot.snapshotDate >= "2026-08-04");
    const expectedTotal = currentSnapshots.reduce(
      (total, snapshot) => total + snapshot.totalConsumptionKwh,
      0,
    );

    expect(seeded).toHaveLength(2);
    expect(result.historyCoverage).toEqual(
      expect.objectContaining({
        expectedDays: 7,
        currentAvailableDays: 3,
        currentComplete: false,
        comparisonAvailable: false,
      }),
    );
    expect(result.temporalAnalysis.points).toHaveLength(3);
    expect(result.temporalAnalysis.points.map((point) => point.id)).toEqual([
      "2026-08-06",
      "2026-08-08",
      "2026-08-10",
    ]);
    expect(
      result.metrics.find((metric) => metric.id === "dailyAverage")
        ?.value,
    ).toBeCloseTo(expectedTotal / 3, 8);
    expect(result.compare).toBe(false);
  });

  it("habilita comparação residencial de 7 dias somente com dois intervalos completos", async () => {
    const subject = createHistorySubject();
    const devices = await subject.deviceService.listDevices(TEST_USER_ID);

    for (let offset = 13; offset >= 1; offset -= 1) {
      const date = shiftCalendarDate("2026-08-10", -offset);
      await subject.historyService.captureCurrentDay(
        TEST_USER_ID,
        devices,
        offset <= 6 ? 1.11 : 0.83,
        new Date(`${date}T15:00:00.000Z`),
      );
    }

    const result = await subject.service.getDashboard(
      { mode: "home", period: "7d", compare: true },
      TEST_USER_ID,
      1.11,
    );
    const persisted = subject.historyRepository.getAll(TEST_USER_ID);
    const currentCost = persisted
      .filter((snapshot) => snapshot.snapshotDate >= "2026-08-04")
      .reduce((total, snapshot) => total + snapshot.estimatedCost, 0);
    const previousCost = persisted
      .filter(
        (snapshot) =>
          snapshot.snapshotDate >= "2026-07-28" &&
          snapshot.snapshotDate <= "2026-08-03",
      )
      .reduce((total, snapshot) => total + snapshot.estimatedCost, 0);

    expect(result.historyCoverage).toEqual(
      expect.objectContaining({
        currentAvailableDays: 7,
        previousAvailableDays: 7,
        currentComplete: true,
        previousComplete: true,
        comparisonAvailable: true,
      }),
    );
    expect(result.compare).toBe(true);
    expect(result.temporalAnalysis.points).toHaveLength(7);
    expect(result.temporalAnalysis.previousTotalKwh).toBeDefined();
    expect(result.periodEnergyAnalysis?.dataOrigin).toBe("estimated");
    expect(result.alerts.every((alert) => alert.dataOrigin === "estimated")).toBe(
      true,
    );
    const costMetric = result.metrics.find(
      (metric) => metric.id === "estimatedCost",
    );
    expect(costMetric?.value).toBeCloseTo(currentCost, 8);
    expect(costMetric?.comparison?.previousValue).toBeCloseTo(
      previousCost,
      8,
    );
  });

  it("nunca persiste snapshots ao carregar o modo demonstração", async () => {
    const { historyRepository, service } = createHistorySubject();

    const result = await service.getDashboard(
      { mode: "demo", period: "30d", compare: true },
      TEST_USER_ID,
    );

    expect(result.dataOrigin).toBe("global-demo");
    expect(historyRepository.upsertCalls).toEqual([]);
    expect(historyRepository.getAll(TEST_USER_ID)).toEqual([]);
  });

  it("mantém a dashboard residencial disponível quando o histórico falha", async () => {
    const subject = createHistorySubject();
    vi.spyOn(subject.historyService, "captureCurrentDay").mockRejectedValue(
      new Error("sensitive persistence detail"),
    );
    vi.spyOn(subject.historyService, "getPeriod").mockRejectedValue(
      new Error("sensitive query detail"),
    );
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      const result = await subject.service.getDashboard(
        { mode: "home", period: "today", compare: true },
        TEST_USER_ID,
      );

      expect(result.todaySnapshot?.totalConsumptionKwh).toBeGreaterThan(0);
      expect(result.compare).toBe(false);
      expect(result.historyAvailable).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        "sensitive persistence detail",
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        "sensitive query detail",
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(TEST_USER_ID);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("mantém o isolamento entre usuários no modo residencial", async () => {
    const firstUserDevices = createDemoDeviceRecords(TEST_USER_ID).slice(0, 2);
    const secondUserDevices = createDemoDeviceRecords(OTHER_USER_ID).slice(0, 1);
    const { service } = createSubject(
      new InMemoryDeviceRepository([
        ...firstUserDevices,
        ...secondUserDevices,
      ]),
    );

    const firstUser = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      TEST_USER_ID,
    );
    const secondUser = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      OTHER_USER_ID,
    );

    expect(firstUser.deviceAnalysis.items).toHaveLength(2);
    expect(secondUser.deviceAnalysis.items).toHaveLength(1);
    expect(
      firstUser.metrics.find((metric) => metric.id === "activeDevices")
        ?.value,
    ).toBe(2);
    expect(
      secondUser.metrics.find((metric) => metric.id === "activeDevices")
        ?.value,
    ).toBe(1);
  });
});

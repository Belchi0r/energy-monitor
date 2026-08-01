import { describe, expect, it } from "vitest";

import type { DeviceInput } from "@/lib/devices/types";
import {
  DeviceNameConflictError,
  DeviceNotFoundError,
  DeviceService,
} from "@/lib/services/device-service";
import { InMemoryDeviceRepository } from "@/tests/device-test-helpers";

const validInput: DeviceInput = {
  name: "Televisor da sala",
  category: "Eletrônicos",
  powerWatts: 180,
  averageDailyHours: 4.5,
  status: "active",
  usageProfileType: "SPLIT",
  usageWindows: [
    { startHour: 8, endHour: 12, weight: 0.5 },
    { startHour: 14, endHour: 18, weight: 0.5 },
  ],
};

function createSubject() {
  const repository = new InMemoryDeviceRepository();

  return {
    repository,
    service: new DeviceService(repository),
  };
}

describe("DeviceService", () => {
  it("cria e relê o dispositivo pelo repositório", async () => {
    const { service } = createSubject();
    const created = await service.createDevice(validInput);
    const reloaded = await service.listDevices();

    expect(created.name).toBe(validInput.name);
    expect(created.estimatedDailyConsumptionKwh).toBeCloseTo(0.81);
    expect(created.usageProfileType).toBe("SPLIT");
    expect(reloaded).toContainEqual(created);
  });

  it("atualiza e persiste os novos valores", async () => {
    const { service } = createSubject();
    const created = await service.createDevice(validInput);
    const updated = await service.updateDevice(created.id, {
      ...validInput,
      powerWatts: 200,
    });
    const reloaded = await service.listDevices();

    expect(updated.estimatedDailyConsumptionKwh).toBe(0.9);
    expect(reloaded.find((device) => device.id === created.id)).toEqual(
      updated,
    );
  });

  it("persiste o perfil de uso e o recupera em nova leitura", async () => {
    const { service } = createSubject();
    const created = await service.createDevice(validInput);
    const updated = await service.updateDevice(created.id, {
      ...validInput,
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 19, endHour: 23, weight: 1 },
      ],
    });
    const reloaded = await service.listDevices();

    expect(updated.usageProfileType).toBe("CUSTOM");
    expect(updated.usageWindows).toEqual([
      { startHour: 19, endHour: 23, weight: 1 },
    ]);
    expect(
      reloaded.find((device) => device.id === created.id)
        ?.usageWindows,
    ).toEqual(updated.usageWindows);
  });

  it("remove e confirma a ausência em uma nova leitura", async () => {
    const { service } = createSubject();
    const created = await service.createDevice(validInput);

    await service.deleteDevice(created.id);

    await expect(service.listDevices()).resolves.not.toContainEqual(
      created,
    );
  });

  it("zera a estimativa atual de dispositivos inativos", async () => {
    const { service } = createSubject();

    const created = await service.createDevice({
      ...validInput,
      status: "inactive",
    });

    expect(created.estimatedDailyConsumptionKwh).toBe(0);
  });

  it("rejeita nomes duplicados sem acoplar ao banco", async () => {
    const { service } = createSubject();

    await expect(
      service.createDevice({
        ...validInput,
        name: "ar-condicionado",
      }),
    ).rejects.toBeInstanceOf(DeviceNameConflictError);
  });

  it("falha explicitamente para identificadores inexistentes", async () => {
    const { service } = createSubject();

    await expect(
      service.updateDevice("missing", validInput),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
    await expect(
      service.deleteDevice("missing"),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
  });
});

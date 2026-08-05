import { describe, expect, it } from "vitest";

import type { DeviceInput } from "@/lib/devices/types";
import { DeviceRepositoryNameConflictError } from "@/lib/repositories/device-repository";
import {
  DeviceNameConflictError,
  DeviceNotFoundError,
  DeviceService,
} from "@/lib/services/device-service";
import {
  InMemoryDeviceRepository,
  OTHER_USER_ID,
  TEST_USER_ID,
} from "@/tests/device-test-helpers";

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
    const { repository, service } = createSubject();
    const created = await service.createDevice(TEST_USER_ID, validInput);
    const reloaded = await service.listDevices(TEST_USER_ID);
    const persisted = await repository.findById(
      TEST_USER_ID,
      created.id,
    );

    expect(created.name).toBe(validInput.name);
    expect(created).not.toHaveProperty("userId");
    expect(persisted?.userId).toBe(TEST_USER_ID);
    expect(created.estimatedDailyConsumptionKwh).toBeCloseTo(0.81);
    expect(created.usageProfileType).toBe("SPLIT");
    expect(reloaded).toContainEqual(created);
  });

  it("atualiza e persiste os novos valores", async () => {
    const { service } = createSubject();
    const created = await service.createDevice(TEST_USER_ID, validInput);
    const updated = await service.updateDevice(TEST_USER_ID, created.id, {
      ...validInput,
      powerWatts: 200,
    });
    const reloaded = await service.listDevices(TEST_USER_ID);

    expect(updated.estimatedDailyConsumptionKwh).toBe(0.9);
    expect(reloaded.find((device) => device.id === created.id)).toEqual(
      updated,
    );
  });

  it("persiste o perfil de uso e o recupera em nova leitura", async () => {
    const { service } = createSubject();
    const created = await service.createDevice(TEST_USER_ID, validInput);
    const updated = await service.updateDevice(TEST_USER_ID, created.id, {
      ...validInput,
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 19, endHour: 23, weight: 1 },
      ],
    });
    const reloaded = await service.listDevices(TEST_USER_ID);

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
    const created = await service.createDevice(TEST_USER_ID, validInput);

    await service.deleteDevice(TEST_USER_ID, created.id);

    await expect(
      service.listDevices(TEST_USER_ID),
    ).resolves.not.toContainEqual(created);
  });

  it("zera a estimativa atual de dispositivos inativos", async () => {
    const { service } = createSubject();

    const created = await service.createDevice(TEST_USER_ID, {
      ...validInput,
      status: "inactive",
    });

    expect(created.estimatedDailyConsumptionKwh).toBe(0);
  });

  it("rejeita nomes duplicados sem acoplar ao banco", async () => {
    const { service } = createSubject();

    await expect(
      service.createDevice(TEST_USER_ID, {
        ...validInput,
        name: "ar-condicionado",
      }),
    ).rejects.toBeInstanceOf(DeviceNameConflictError);
  });

  it("falha explicitamente para identificadores inexistentes", async () => {
    const { service } = createSubject();

    await expect(
      service.updateDevice(TEST_USER_ID, "missing", validInput),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
    await expect(
      service.deleteDevice(TEST_USER_ID, "missing"),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
  });

  it("não encontra, atualiza ou exclui dispositivo de outro usuário", async () => {
    const { service } = createSubject();
    const ownDevice = await service.createDevice(
      TEST_USER_ID,
      validInput,
    );

    await expect(
      service.updateDevice(OTHER_USER_ID, ownDevice.id, {
        ...validInput,
        powerWatts: 999,
      }),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
    await expect(
      service.deleteDevice(OTHER_USER_ID, ownDevice.id),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
    await expect(service.listDevices(OTHER_USER_ID)).resolves.toEqual(
      [],
    );
    await expect(
      service.listDevices(TEST_USER_ID),
    ).resolves.toContainEqual(ownDevice);
  });

  it("aplica conflito case-insensitive apenas dentro do usuário", async () => {
    const { service } = createSubject();
    const first = await service.createDevice(TEST_USER_ID, validInput);
    const second = await service.createDevice(OTHER_USER_ID, {
      ...validInput,
      name: validInput.name.toLocaleUpperCase("pt-BR"),
    });

    expect(first.name).toBe(validInput.name);
    expect(second.name).toBe(validInput.name.toLocaleUpperCase("pt-BR"));
    await expect(
      service.createDevice(TEST_USER_ID, {
        ...validInput,
        name: validInput.name.toLocaleUpperCase("pt-BR"),
      }),
    ).rejects.toBeInstanceOf(DeviceNameConflictError);
  });

  it("converte conflito atômico do repositório em erro público", async () => {
    const repository = new InMemoryDeviceRepository([]);
    repository.findByName = async () => null;
    repository.create = async () => {
      throw new DeviceRepositoryNameConflictError();
    };
    const service = new DeviceService(repository);

    await expect(
      service.createDevice(TEST_USER_ID, validInput),
    ).rejects.toBeInstanceOf(DeviceNameConflictError);
  });
});

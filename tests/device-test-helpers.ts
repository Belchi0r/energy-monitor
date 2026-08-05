import { demoDevices } from "@/lib/devices/demo-devices";
import type {
  DeviceInput,
  DeviceRecord,
} from "@/lib/devices/types";
import {
  DeviceRepositoryNameConflictError,
  type DeviceRepository,
} from "@/lib/repositories/device-repository";

const initialDate = new Date("2026-07-29T12:00:00.000Z");
export const TEST_USER_ID =
  "11111111-1111-4111-8111-111111111111";
export const OTHER_USER_ID =
  "22222222-2222-4222-8222-222222222222";

export function createDemoDeviceRecords(
  userId = TEST_USER_ID,
): DeviceRecord[] {
  return demoDevices.map((device) => ({
    ...device,
    userId,
    createdAt: initialDate,
    updatedAt: initialDate,
  }));
}

export class InMemoryDeviceRepository implements DeviceRepository {
  private nextId = 1;

  constructor(
    private devices: DeviceRecord[] = createDemoDeviceRecords(),
  ) {}

  async findAll(userId: string): Promise<readonly DeviceRecord[]> {
    return this.devices
      .filter((device) => device.userId === userId)
      .map((device) => ({ ...device }));
  }

  async findById(
    userId: string,
    id: string,
  ): Promise<DeviceRecord | null> {
    const device = this.devices.find(
      (item) => item.id === id && item.userId === userId,
    );

    return device ? { ...device } : null;
  }

  async findByName(
    userId: string,
    name: string,
  ): Promise<DeviceRecord | null> {
    const normalizedName = name.toLocaleLowerCase("pt-BR");
    const device = this.devices.find(
      (item) =>
        item.userId === userId &&
        item.name.toLocaleLowerCase("pt-BR") === normalizedName,
    );

    return device ? { ...device } : null;
  }

  async create(
    userId: string,
    input: DeviceInput,
  ): Promise<DeviceRecord> {
    this.assertNameIsUnique(userId, input.name);

    const device: DeviceRecord = {
      id: `created-device-${this.nextId++}`,
      userId,
      ...input,
      createdAt: initialDate,
      updatedAt: initialDate,
    };

    this.devices = [...this.devices, device];

    return { ...device };
  }

  async update(
    userId: string,
    id: string,
    input: DeviceInput,
  ): Promise<DeviceRecord | null> {
    const current = this.devices.find(
      (device) => device.id === id && device.userId === userId,
    );

    if (!current) {
      return null;
    }

    this.assertNameIsUnique(userId, input.name, id);

    const updated: DeviceRecord = {
      ...current,
      ...input,
      updatedAt: new Date("2026-07-29T13:00:00.000Z"),
    };
    this.devices = this.devices.map((device) =>
      device.id === id ? updated : device,
    );

    return { ...updated };
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const initialLength = this.devices.length;
    this.devices = this.devices.filter(
      (device) => !(device.id === id && device.userId === userId),
    );

    return this.devices.length < initialLength;
  }

  private assertNameIsUnique(
    userId: string,
    name: string,
    currentDeviceId?: string,
  ) {
    const normalizedName = name.trim().toLocaleLowerCase("pt-BR");
    const conflict = this.devices.some(
      (device) =>
        device.userId === userId &&
        device.id !== currentDeviceId &&
        device.name.trim().toLocaleLowerCase("pt-BR") ===
          normalizedName,
    );

    if (conflict) {
      throw new DeviceRepositoryNameConflictError();
    }
  }
}

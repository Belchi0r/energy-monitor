import { demoDevices } from "@/lib/devices/demo-devices";
import type {
  DeviceInput,
  DeviceRecord,
} from "@/lib/devices/types";
import type { DeviceRepository } from "@/lib/repositories/device-repository";

const initialDate = new Date("2026-07-29T12:00:00.000Z");

export function createDemoDeviceRecords(): DeviceRecord[] {
  return demoDevices.map((device) => ({
    ...device,
    createdAt: initialDate,
    updatedAt: initialDate,
  }));
}

export class InMemoryDeviceRepository implements DeviceRepository {
  private nextId = 1;

  constructor(
    private devices: DeviceRecord[] = createDemoDeviceRecords(),
  ) {}

  async findAll(): Promise<readonly DeviceRecord[]> {
    return this.devices.map((device) => ({ ...device }));
  }

  async findById(id: string): Promise<DeviceRecord | null> {
    const device = this.devices.find((item) => item.id === id);

    return device ? { ...device } : null;
  }

  async findByName(name: string): Promise<DeviceRecord | null> {
    const normalizedName = name.toLocaleLowerCase("pt-BR");
    const device = this.devices.find(
      (item) =>
        item.name.toLocaleLowerCase("pt-BR") === normalizedName,
    );

    return device ? { ...device } : null;
  }

  async create(input: DeviceInput): Promise<DeviceRecord> {
    const device: DeviceRecord = {
      id: `created-device-${this.nextId++}`,
      ...input,
      createdAt: initialDate,
      updatedAt: initialDate,
    };

    this.devices = [...this.devices, device];

    return { ...device };
  }

  async update(
    id: string,
    input: DeviceInput,
  ): Promise<DeviceRecord> {
    const current = this.devices.find((device) => device.id === id);

    if (!current) {
      throw new Error("Registro inexistente.");
    }

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

  async delete(id: string): Promise<void> {
    this.devices = this.devices.filter((device) => device.id !== id);
  }
}

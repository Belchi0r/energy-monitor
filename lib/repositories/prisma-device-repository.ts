import type { PrismaClient } from "@/generated/prisma/client";
import {
  deviceCategories,
  type DeviceCategory,
  type DeviceInput,
  type DeviceRecord,
  type DeviceStatus,
} from "@/lib/devices/types";
import type { DeviceRepository } from "@/lib/repositories/device-repository";
import { resolveUsageProfile } from "@/lib/energy/usage-profiles";

type PersistedDevice = {
  id: string;
  name: string;
  category: string;
  powerWatts: number;
  averageDailyHours: number;
  status: string;
  usageProfileType: string;
  usageWindows: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function parseCategory(value: string): DeviceCategory {
  if ((deviceCategories as readonly string[]).includes(value)) {
    return value as DeviceCategory;
  }

  throw new Error(`Categoria de dispositivo inválida: "${value}".`);
}

function parseStatus(value: string): DeviceStatus {
  if (value === "active" || value === "inactive") {
    return value;
  }

  throw new Error(`Status de dispositivo inválido: "${value}".`);
}

function toDomainDevice(persisted: PersistedDevice): DeviceRecord {
  const usageProfile = resolveUsageProfile({
    category: persisted.category,
    usageProfileType: persisted.usageProfileType,
    usageWindows: persisted.usageWindows,
  });

  return {
    id: persisted.id,
    name: persisted.name,
    category: parseCategory(persisted.category),
    powerWatts: persisted.powerWatts,
    averageDailyHours: persisted.averageDailyHours,
    status: parseStatus(persisted.status),
    usageProfileType: usageProfile.type,
    usageWindows: usageProfile.windows,
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
  };
}

export class PrismaDeviceRepository implements DeviceRepository {
  constructor(private readonly client: PrismaClient) {}

  async findAll(): Promise<readonly DeviceRecord[]> {
    const devices = await this.client.device.findMany({
      orderBy: [
        {
          status: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return devices.map(toDomainDevice);
  }

  async findById(id: string): Promise<DeviceRecord | null> {
    const device = await this.client.device.findUnique({
      where: {
        id,
      },
    });

    return device ? toDomainDevice(device) : null;
  }

  async findByName(name: string): Promise<DeviceRecord | null> {
    const device = await this.client.device.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    return device ? toDomainDevice(device) : null;
  }

  async create(input: DeviceInput): Promise<DeviceRecord> {
    const device = await this.client.device.create({
      data: {
        ...input,
        usageWindows: input.usageWindows.map((window) => ({
          ...window,
        })),
      },
    });

    return toDomainDevice(device);
  }

  async update(
    id: string,
    input: DeviceInput,
  ): Promise<DeviceRecord> {
    const device = await this.client.device.update({
      where: {
        id,
      },
      data: {
        ...input,
        usageWindows: input.usageWindows.map((window) => ({
          ...window,
        })),
      },
    });

    return toDomainDevice(device);
  }

  async delete(id: string): Promise<void> {
    await this.client.device.delete({
      where: {
        id,
      },
    });
  }
}

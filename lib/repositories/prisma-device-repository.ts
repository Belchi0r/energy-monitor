import type { PrismaClient } from "@/generated/prisma/client";
import {
  deviceCategories,
  type DeviceCategory,
  type DeviceInput,
  type DeviceRecord,
  type DeviceStatus,
} from "@/lib/devices/types";
import {
  DeviceRepositoryNameConflictError,
  type DeviceRepository,
} from "@/lib/repositories/device-repository";
import { resolveUsageProfile } from "@/lib/energy/usage-profiles";

type PersistedDevice = {
  id: string;
  userId: string;
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
    userId: persisted.userId,
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

function hasPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export class PrismaDeviceRepository implements DeviceRepository {
  constructor(private readonly client: PrismaClient) {}

  async findAll(userId: string): Promise<readonly DeviceRecord[]> {
    const devices = await this.client.device.findMany({
      where: {
        userId,
      },
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

  async findById(
    userId: string,
    id: string,
  ): Promise<DeviceRecord | null> {
    const device = await this.client.device.findFirst({
      where: {
        id,
        userId,
      },
    });

    return device ? toDomainDevice(device) : null;
  }

  async findByName(
    userId: string,
    name: string,
  ): Promise<DeviceRecord | null> {
    const device = await this.client.device.findFirst({
      where: {
        userId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    return device ? toDomainDevice(device) : null;
  }

  async create(
    userId: string,
    input: DeviceInput,
  ): Promise<DeviceRecord> {
    try {
      const device = await this.client.device.create({
        data: {
          ...input,
          userId,
          usageWindows: input.usageWindows.map((window) => ({
            ...window,
          })),
        },
      });

      return toDomainDevice(device);
    } catch (error) {
      if (hasPrismaErrorCode(error, "P2002")) {
        throw new DeviceRepositoryNameConflictError();
      }

      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    input: DeviceInput,
  ): Promise<DeviceRecord | null> {
    try {
      const device = await this.client.device.update({
        where: {
          id,
          userId,
        },
        data: {
          ...input,
          usageWindows: input.usageWindows.map((window) => ({
            ...window,
          })),
        },
      });

      return toDomainDevice(device);
    } catch (error) {
      if (hasPrismaErrorCode(error, "P2002")) {
        throw new DeviceRepositoryNameConflictError();
      }

      if (hasPrismaErrorCode(error, "P2025")) {
        return null;
      }

      throw error;
    }
  }

  async delete(userId: string, id: string): Promise<boolean> {
    try {
      await this.client.device.delete({
        where: {
          id,
          userId,
        },
      });

      return true;
    } catch (error) {
      if (hasPrismaErrorCode(error, "P2025")) {
        return false;
      }

      throw error;
    }
  }
}

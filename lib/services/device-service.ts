import type {
  DeviceInput,
  DeviceRecord,
  DeviceView,
} from "@/lib/devices/types";
import { calculateDeviceConsumptionKwh } from "@/lib/energy/energy-engine.utils";
import {
  resolveUsageProfile,
  resolveUsageProfileDetails,
} from "@/lib/energy/usage-profiles";
import {
  DeviceRepositoryNameConflictError,
  type DeviceRepository,
} from "@/lib/repositories/device-repository";

export function toDeviceView(device: DeviceRecord): DeviceView {
  const estimatedDailyConsumptionKwh =
    device.status === "active"
      ? calculateDeviceConsumptionKwh(device)
      : 0;
  const usageProfile = resolveUsageProfileDetails(device);

  return {
    id: device.id,
    name: device.name,
    category: device.category,
    powerWatts: device.powerWatts,
    averageDailyHours: device.averageDailyHours,
    status: device.status,
    usageProfileType: usageProfile.type,
    usageWindows: usageProfile.windows,
    usageProfileFallbackUsed: usageProfile.fallbackUsed,
    description: `Estimativa atual para ${device.category.toLocaleLowerCase("pt-BR")}.`,
    estimatedDailyConsumptionKwh,
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString(),
  };
}

export class DeviceNotFoundError extends Error {
  constructor() {
    super("Dispositivo não encontrado.");
    this.name = "DeviceNotFoundError";
  }
}

export class DeviceNameConflictError extends Error {
  constructor() {
    super("Já existe um dispositivo com esse nome.");
    this.name = "DeviceNameConflictError";
  }
}

export class DeviceService {
  constructor(private readonly repository: DeviceRepository) {}

  async listDevices(userId: string): Promise<readonly DeviceView[]> {
    const devices = await this.repository.findAll(userId);

    return devices.map(toDeviceView);
  }

  async createDevice(
    userId: string,
    input: DeviceInput,
  ): Promise<DeviceView> {
    await this.ensureNameIsAvailable(userId, input.name);

    let device: DeviceRecord;

    try {
      device = await this.repository.create(
        userId,
        this.normalizeInput(input),
      );
    } catch (error) {
      this.rethrowRepositoryConflict(error);
    }

    return toDeviceView(device);
  }

  async updateDevice(
    userId: string,
    id: string,
    input: DeviceInput,
  ): Promise<DeviceView> {
    const current = await this.repository.findById(userId, id);

    if (!current) {
      throw new DeviceNotFoundError();
    }

    await this.ensureNameIsAvailable(userId, input.name, id);

    let device: DeviceRecord | null;

    try {
      device = await this.repository.update(
        userId,
        id,
        this.normalizeInput(input),
      );
    } catch (error) {
      this.rethrowRepositoryConflict(error);
    }

    if (!device) {
      throw new DeviceNotFoundError();
    }

    return toDeviceView(device);
  }

  async deleteDevice(userId: string, id: string): Promise<void> {
    const deleted = await this.repository.delete(userId, id);

    if (!deleted) {
      throw new DeviceNotFoundError();
    }
  }

  private normalizeInput(input: DeviceInput): DeviceInput {
    const usageProfile = resolveUsageProfile(input);

    return {
      ...input,
      name: input.name.trim(),
      usageProfileType: usageProfile.type,
      usageWindows: usageProfile.windows,
    };
  }

  private async ensureNameIsAvailable(
    userId: string,
    name: string,
    currentDeviceId?: string,
  ) {
    const existing = await this.repository.findByName(
      userId,
      name.trim(),
    );

    if (existing && existing.id !== currentDeviceId) {
      throw new DeviceNameConflictError();
    }
  }

  private rethrowRepositoryConflict(error: unknown): never {
    if (error instanceof DeviceRepositoryNameConflictError) {
      throw new DeviceNameConflictError();
    }

    throw error;
  }
}

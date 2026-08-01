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
import type { DeviceRepository } from "@/lib/repositories/device-repository";

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

  async listDevices(): Promise<readonly DeviceView[]> {
    const devices = await this.repository.findAll();

    return devices.map(toDeviceView);
  }

  async createDevice(input: DeviceInput): Promise<DeviceView> {
    await this.ensureNameIsAvailable(input.name);
    const device = await this.repository.create(this.normalizeInput(input));

    return toDeviceView(device);
  }

  async updateDevice(
    id: string,
    input: DeviceInput,
  ): Promise<DeviceView> {
    const current = await this.repository.findById(id);

    if (!current) {
      throw new DeviceNotFoundError();
    }

    await this.ensureNameIsAvailable(input.name, id);
    const device = await this.repository.update(
      id,
      this.normalizeInput(input),
    );

    return toDeviceView(device);
  }

  async deleteDevice(id: string): Promise<void> {
    const current = await this.repository.findById(id);

    if (!current) {
      throw new DeviceNotFoundError();
    }

    await this.repository.delete(id);
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
    name: string,
    currentDeviceId?: string,
  ) {
    const existing = await this.repository.findByName(name.trim());

    if (existing && existing.id !== currentDeviceId) {
      throw new DeviceNameConflictError();
    }
  }
}

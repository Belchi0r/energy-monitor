import type {
  DeviceInput,
  DeviceRecord,
} from "@/lib/devices/types";

export class DeviceRepositoryNameConflictError extends Error {
  constructor() {
    super("Device name conflicts within the owner scope.");
    this.name = "DeviceRepositoryNameConflictError";
  }
}

export interface DeviceRepository {
  findAll(userId: string): Promise<readonly DeviceRecord[]>;
  findById(userId: string, id: string): Promise<DeviceRecord | null>;
  findByName(
    userId: string,
    name: string,
  ): Promise<DeviceRecord | null>;
  create(userId: string, input: DeviceInput): Promise<DeviceRecord>;
  update(
    userId: string,
    id: string,
    input: DeviceInput,
  ): Promise<DeviceRecord | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

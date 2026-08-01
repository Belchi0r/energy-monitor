import type {
  DeviceInput,
  DeviceRecord,
} from "@/lib/devices/types";

export interface DeviceRepository {
  findAll(): Promise<readonly DeviceRecord[]>;
  findById(id: string): Promise<DeviceRecord | null>;
  findByName(name: string): Promise<DeviceRecord | null>;
  create(input: DeviceInput): Promise<DeviceRecord>;
  update(id: string, input: DeviceInput): Promise<DeviceRecord>;
  delete(id: string): Promise<void>;
}

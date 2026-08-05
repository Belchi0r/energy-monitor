import type {
  UsageProfileType,
  UsageWindow,
} from "@/lib/energy/usage-profiles";

export const deviceCategories = [
  "Climatização",
  "Aquecimento",
  "Refrigeração",
  "Lavanderia",
  "Iluminação",
  "Cozinha",
  "Eletrônicos",
  "Outros",
] as const;

export const deviceStatuses = ["active", "inactive"] as const;

export type DeviceCategory = (typeof deviceCategories)[number];
export type DeviceStatus = (typeof deviceStatuses)[number];

export type DeviceInput = {
  name: string;
  category: DeviceCategory;
  powerWatts: number;
  averageDailyHours: number;
  status: DeviceStatus;
  usageProfileType: UsageProfileType;
  usageWindows: readonly UsageWindow[];
};

export type DeviceRecord = DeviceInput & {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceView = DeviceInput & {
  id: string;
  description: string;
  estimatedDailyConsumptionKwh: number;
  usageProfileFallbackUsed?: boolean;
  createdAt: string;
  updatedAt: string;
};

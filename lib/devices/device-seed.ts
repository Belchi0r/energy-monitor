import { demoDevices } from "@/lib/devices/demo-devices";
import type { DeviceInput } from "@/lib/devices/types";
import { getPresetUsageWindows } from "@/lib/energy/usage-profiles";

export type DeviceSeedEntry = DeviceInput & {
  id: string;
  userId: string;
};

export type DeviceSeedUpsert = {
  where: {
    id: string;
    userId: string;
  };
  update: DeviceInput;
  create: DeviceSeedEntry;
};

function cloneDeviceInput(device: DeviceInput): DeviceInput {
  return {
    ...device,
    usageWindows: device.usageWindows.map((window) => ({
      ...window,
    })),
  };
}

export function buildDeviceSeedUpserts(
  userId: string,
): readonly DeviceSeedUpsert[] {
  return demoDevices.map((device) => ({
    where: {
      id: device.id,
      userId,
    },
    update: cloneDeviceInput(device),
    create: {
      id: device.id,
      userId,
      ...cloneDeviceInput(device),
    },
  }));
}

export const notebookSeedProfile = {
  usageProfileType: "SPLIT",
  usageWindows: getPresetUsageWindows("SPLIT"),
} as const satisfies Pick<
  DeviceInput,
  "usageProfileType" | "usageWindows"
>;

import { demoDevices } from "@/lib/devices/demo-devices";
import type { DeviceInput } from "@/lib/devices/types";
import { getPresetUsageWindows } from "@/lib/energy/usage-profiles";

export type DeviceSeedEntry = DeviceInput & {
  id: string;
};

export type DeviceSeedUpsert = {
  where: {
    id: string;
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

export function buildDeviceSeedUpserts(): readonly DeviceSeedUpsert[] {
  return demoDevices.map((device) => ({
    where: {
      id: device.id,
    },
    update: cloneDeviceInput(device),
    create: {
      id: device.id,
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

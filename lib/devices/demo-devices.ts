import { dashboardDatasets } from "@/lib/dashboard/datasets";
import type {
  DeviceCategory,
  DeviceInput,
} from "@/lib/devices/types";

type DemoDeviceProfile = {
  category: DeviceCategory;
  powerWatts: number;
  averageDailyHours: number;
  usageProfileType: DeviceInput["usageProfileType"];
  usageWindows: DeviceInput["usageWindows"];
};

const demoDeviceProfiles: Record<string, DemoDeviceProfile> = {
  "air-conditioner": {
    category: "Climatização",
    powerWatts: 1500,
    averageDailyHours: 2,
    usageProfileType: "CUSTOM",
    usageWindows: [{ startHour: 19, endHour: 23, weight: 1 }],
  },
  shower: {
    category: "Aquecimento",
    powerWatts: 5500,
    averageDailyHours: 0.38,
    usageProfileType: "CUSTOM",
    usageWindows: [
      { startHour: 6, endHour: 8, weight: 0.45 },
      { startHour: 18, endHour: 22, weight: 0.55 },
    ],
  },
  refrigerator: {
    category: "Refrigeração",
    powerWatts: 150,
    averageDailyHours: 10,
    usageProfileType: "CONTINUOUS",
    usageWindows: [{ startHour: 0, endHour: 24, weight: 1 }],
  },
  "washing-machine": {
    category: "Lavanderia",
    powerWatts: 600,
    averageDailyHours: 2,
    usageProfileType: "CUSTOM",
    usageWindows: [{ startHour: 10, endHour: 14, weight: 1 }],
  },
  others: {
    category: "Outros",
    powerWatts: 300,
    averageDailyHours: 3,
    usageProfileType: "DISTRIBUTED",
    usageWindows: [
      { startHour: 6, endHour: 10, weight: 0.2 },
      { startHour: 10, endHour: 18, weight: 0.5 },
      { startHour: 18, endHour: 22, weight: 0.3 },
    ],
  },
};

export const demoDevices = dashboardDatasets.today.deviceConsumption.map(
  (snapshot) => {
    const profile = demoDeviceProfiles[snapshot.id];

    if (!profile) {
      throw new Error(
        `Perfil do dispositivo demonstrativo não encontrado: "${snapshot.id}".`,
      );
    }

    return {
      id: snapshot.id,
      name: snapshot.device,
      ...profile,
      status: "active",
    };
  },
) satisfies readonly (DeviceInput & { id: string })[];

import {
  deviceCategories,
  type DeviceInput,
  type DeviceView,
} from "@/lib/devices/types";
import {
  formatUsageWindowsPreview,
  getPresetUsageWindows,
  isValidUsageWindow,
  MAX_USAGE_WINDOWS,
  type UsageProfileType,
  type UsageWindow,
} from "@/lib/energy/usage-profiles";
import { deviceInputSchema } from "@/lib/schemas/device-schema";

export { deviceCategories, MAX_USAGE_WINDOWS };

export const usageProfileOptions = [
  { value: "CONTINUOUS", label: "Uso contínuo" },
  { value: "MORNING", label: "Manhã" },
  { value: "AFTERNOON", label: "Tarde" },
  { value: "EVENING", label: "Noite" },
  { value: "SPLIT", label: "Manhã e tarde" },
  { value: "DISTRIBUTED", label: "Distribuído" },
  { value: "NIGHT", label: "Madrugada" },
  { value: "CUSTOM", label: "Personalizado" },
] as const satisfies readonly {
  value: UsageProfileType;
  label: string;
}[];

export type UsageWindowFormValues = {
  startHour: string;
  endHour: string;
  weight: string;
};

export type DeviceFormValues = {
  name: string;
  category: DeviceInput["category"];
  powerWatts: string;
  averageDailyHours: string;
  status: DeviceInput["status"];
  usageProfileType: UsageProfileType;
  usageWindows: UsageWindowFormValues[];
};

export type DeviceFormErrors = Record<
  string,
  string | undefined
>;

function usageWindowToFormValues(
  window: UsageWindow,
): UsageWindowFormValues {
  return {
    startHour: String(window.startHour),
    endHour: String(window.endHour),
    weight: String(window.weight),
  };
}

function toUsageWindows(
  windows: readonly UsageWindowFormValues[],
): UsageWindow[] {
  return windows.map((window) => ({
    startHour: Number(window.startHour),
    endHour: Number(window.endHour),
    weight: Number(window.weight),
  }));
}

export function createFormWindowsForProfile(
  type: UsageProfileType,
  currentWindows: readonly UsageWindowFormValues[] = [],
): UsageWindowFormValues[] {
  if (type === "CUSTOM") {
    return currentWindows.length > 0
      ? currentWindows.map((window) => ({ ...window }))
      : [{ startHour: "8", endHour: "12", weight: "1" }];
  }

  return getPresetUsageWindows(type).map(usageWindowToFormValues);
}

export const emptyDeviceFormValues: DeviceFormValues = {
  name: "",
  category: "Eletrônicos",
  powerWatts: "",
  averageDailyHours: "",
  status: "active",
  usageProfileType: "SPLIT",
  usageWindows: createFormWindowsForProfile("SPLIT"),
};

export function deviceToFormValues(
  device: DeviceView,
): DeviceFormValues {
  return {
    name: device.name,
    category: device.category,
    powerWatts: String(device.powerWatts),
    averageDailyHours: String(device.averageDailyHours),
    status: device.status,
    usageProfileType: device.usageProfileType,
    usageWindows: device.usageWindows.map(usageWindowToFormValues),
  };
}

export function formValuesToDeviceInput(
  values: DeviceFormValues,
): DeviceInput {
  return {
    name: values.name,
    category: values.category,
    powerWatts: Number(values.powerWatts),
    averageDailyHours: Number(values.averageDailyHours),
    status: values.status,
    usageProfileType: values.usageProfileType,
    usageWindows: toUsageWindows(values.usageWindows),
  };
}

export function getUsageProfilePreview(
  windows: readonly UsageWindowFormValues[],
) {
  const parsedWindows = toUsageWindows(windows).filter(
    isValidUsageWindow,
  );

  return formatUsageWindowsPreview(parsedWindows);
}

export function validateDeviceForm(
  values: DeviceFormValues,
  existingNames: readonly string[],
): DeviceFormErrors {
  const errors: DeviceFormErrors = {};
  const input = formValuesToDeviceInput(values);
  const result = deviceInputSchema.safeParse(input);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.map(String).join(".");

      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    }
  }

  const normalizedName = values.name
    .trim()
    .toLocaleLowerCase("pt-BR");
  const hasDuplicateName = existingNames.some(
    (name) =>
      name.trim().toLocaleLowerCase("pt-BR") === normalizedName,
  );

  if (!errors.name && hasDuplicateName) {
    errors.name = "Já existe um dispositivo com esse nome.";
  }

  return errors;
}

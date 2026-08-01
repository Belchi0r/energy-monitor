import { TODAY_INTERVAL_HOURS } from "@/lib/energy/energy-engine.constants";

export const usageProfileTypes = [
  "CONTINUOUS",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
  "SPLIT",
  "CUSTOM",
  "DISTRIBUTED",
] as const;

export type UsageProfileType = (typeof usageProfileTypes)[number];

export type UsageWindow = {
  startHour: number;
  endHour: number;
  weight: number;
};

export type UsageProfile = {
  type: UsageProfileType;
  windows: readonly UsageWindow[];
};

export type ResolvedUsageProfile = UsageProfile & {
  fallbackUsed: boolean;
};

export const MAX_USAGE_WINDOWS = 6;

const INTERVAL_DURATION_HOURS = 2;

const usageProfilePresets = {
  CONTINUOUS: [{ startHour: 0, endHour: 24, weight: 1 }],
  MORNING: [{ startHour: 6, endHour: 12, weight: 1 }],
  AFTERNOON: [{ startHour: 12, endHour: 18, weight: 1 }],
  EVENING: [{ startHour: 18, endHour: 24, weight: 1 }],
  NIGHT: [{ startHour: 0, endHour: 6, weight: 1 }],
  SPLIT: [
    { startHour: 8, endHour: 12, weight: 0.5 },
    { startHour: 14, endHour: 18, weight: 0.5 },
  ],
  DISTRIBUTED: [
    { startHour: 6, endHour: 10, weight: 0.2 },
    { startHour: 10, endHour: 18, weight: 0.5 },
    { startHour: 18, endHour: 22, weight: 0.3 },
  ],
} as const satisfies Record<
  Exclude<UsageProfileType, "CUSTOM">,
  readonly UsageWindow[]
>;

const categoryDefaultProfile: Record<
  string,
  Exclude<UsageProfileType, "CUSTOM">
> = {
  Climatização: "EVENING",
  Aquecimento: "SPLIT",
  Refrigeração: "CONTINUOUS",
  Lavanderia: "AFTERNOON",
  Iluminação: "EVENING",
  Cozinha: "SPLIT",
  Eletrônicos: "SPLIT",
  Outros: "DISTRIBUTED",
};

function cloneWindows(
  windows: readonly UsageWindow[],
): UsageWindow[] {
  return windows.map((window) => ({ ...window }));
}

export function isUsageProfileType(
  value: unknown,
): value is UsageProfileType {
  return (
    typeof value === "string" &&
    (usageProfileTypes as readonly string[]).includes(value)
  );
}

export function isValidUsageWindow(
  value: unknown,
): value is UsageWindow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const window = value as Record<string, unknown>;
  const { startHour, endHour, weight } = window;

  return (
    typeof startHour === "number" &&
    Number.isInteger(startHour) &&
    startHour >= 0 &&
    startHour <= 23 &&
    typeof endHour === "number" &&
    Number.isInteger(endHour) &&
    endHour >= 1 &&
    endHour <= 24 &&
    startHour < endHour &&
    typeof weight === "number" &&
    Number.isFinite(weight) &&
    weight > 0
  );
}

export function parseUsageWindows(
  value: unknown,
): UsageWindow[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_USAGE_WINDOWS ||
    !value.every(isValidUsageWindow)
  ) {
    return null;
  }

  return cloneWindows(value);
}

export function getPresetUsageWindows(
  type: Exclude<UsageProfileType, "CUSTOM">,
): UsageWindow[] {
  return cloneWindows(usageProfilePresets[type]);
}

export function getDefaultUsageProfile(category: string): UsageProfile {
  const type = categoryDefaultProfile[category] ?? "DISTRIBUTED";

  return {
    type,
    windows: getPresetUsageWindows(type),
  };
}

export function resolveUsageProfile(input: {
  category: string;
  usageProfileType?: unknown;
  usageWindows?: unknown;
}): UsageProfile {
  const profile = resolveUsageProfileDetails(input);

  return {
    type: profile.type,
    windows: profile.windows,
  };
}

export function resolveUsageProfileDetails(input: {
  category: string;
  usageProfileType?: unknown;
  usageWindows?: unknown;
}): ResolvedUsageProfile {
  const defaultProfile = getDefaultUsageProfile(input.category);

  if (!isUsageProfileType(input.usageProfileType)) {
    return {
      ...defaultProfile,
      fallbackUsed: true,
    };
  }

  const type = input.usageProfileType;
  const parsedWindows = parseUsageWindows(input.usageWindows);

  if (parsedWindows) {
    return {
      type,
      windows: parsedWindows,
      fallbackUsed: false,
    };
  }

  if (type === "CUSTOM") {
    return {
      ...defaultProfile,
      fallbackUsed: true,
    };
  }

  return {
    type,
    windows: getPresetUsageWindows(type),
    fallbackUsed: true,
  };
}

export function buildUsageProfileWeights(input: {
  category: string;
  usageProfileType?: unknown;
  usageWindows?: unknown;
}): readonly number[] {
  const profile = resolveUsageProfile(input);
  const weights = TODAY_INTERVAL_HOURS.map(() => 0);

  for (const window of profile.windows) {
    const windowDuration = window.endHour - window.startHour;

    TODAY_INTERVAL_HOURS.forEach((hour, index) => {
      const intervalStart = Number.parseInt(hour, 10);
      const intervalEnd = intervalStart + INTERVAL_DURATION_HOURS;
      const overlap = Math.max(
        0,
        Math.min(window.endHour, intervalEnd) -
          Math.max(window.startHour, intervalStart),
      );

      if (overlap > 0) {
        weights[index] +=
          window.weight * (overlap / windowDuration);
      }
    });
  }

  return weights;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}h`;
}

export function formatUsageWindowsPreview(
  windows: readonly UsageWindow[],
) {
  const labels = windows
    .toSorted(
      (first, second) =>
        first.startHour - second.startHour ||
        first.endHour - second.endHour,
    )
    .map(
      (window) =>
        `${formatHour(window.startHour)}–${formatHour(window.endHour)}`,
    );

  if (labels.length === 0) {
    return "Perfil distribuído ao longo do dia.";
  }

  if (labels.length === 1) {
    return `Uso estimado: ${labels[0]}.`;
  }

  return `Uso estimado: ${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}.`;
}

import {
  ALERT_SEVERITY_WEIGHT,
  ENERGY_SCORE_THRESHOLDS,
  ESSENTIAL_DEVICE_CATEGORIES,
  ESSENTIAL_DEVICE_NAME_FRAGMENTS,
  ESTIMATED_MONTH_DAYS,
  ESTIMATED_YEAR_MONTHS,
  OPPORTUNITY_ELIGIBILITY_ORDER,
  RECOMMENDATION_PRIORITY_WEIGHT,
} from "@/lib/energy/advisor/energy-advisor.constants";
import type {
  DeviceSavingOpportunity,
  EnergyAdvisorAlert,
  EnergyEfficiencyStatus,
  EnergyRecommendation,
  EnergyRecommendationImpact,
} from "@/lib/energy/advisor/energy-advisor.types";
import type { TodayDeviceDistribution } from "@/lib/energy/energy-engine.types";

export function toFiniteNonNegative(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function round(value: number, fractionDigits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** fractionDigits;
  if (Math.abs(value) > Number.MAX_VALUE / multiplier) {
    return value;
  }

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function formatAnalysisNumber(
  value: number,
  fractionDigits = 1,
) {
  const safeValue = toFiniteNonNegative(value);

  if (safeValue > 1_000_000_000) {
    return "mais de 1 bilhão";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: fractionDigits,
  }).format(safeValue);
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function isEssentialDevice(
  device: Pick<TodayDeviceDistribution, "name" | "category">,
) {
  const normalizedName = normalizeText(device.name);

  return (
    ESSENTIAL_DEVICE_CATEGORIES.some(
      (category) =>
        normalizeText(category) === normalizeText(device.category),
    ) ||
    ESSENTIAL_DEVICE_NAME_FRAGMENTS.some((fragment) =>
      normalizedName.includes(normalizeText(fragment)),
    )
  );
}

const DEVICE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  notebook: "Notebook",
  "ar-condicionado": "Ar-condicionado",
  "chuveiro eletrico": "Chuveiro elétrico",
  geladeira: "Geladeira",
  "maquina de lavar": "Máquina de lavar",
  outros: "Outros",
};

export function formatDeviceDisplayName(value: string) {
  const normalized = normalizeText(value.trim());
  const knownName = DEVICE_DISPLAY_NAMES[normalized];

  if (knownName) {
    return knownName;
  }

  const trimmed = value.trim();

  return trimmed.length === 0
    ? "Dispositivo sem nome"
    : `${trimmed.charAt(0).toLocaleUpperCase("pt-BR")}${trimmed.slice(1)}`;
}

export function getEfficiencyStatus(
  score: number,
): EnergyEfficiencyStatus {
  if (score >= ENERGY_SCORE_THRESHOLDS.efficient) {
    return "efficient";
  }

  if (score >= ENERGY_SCORE_THRESHOLDS.balanced) {
    return "balanced";
  }

  if (score >= ENERGY_SCORE_THRESHOLDS.attention) {
    return "attention";
  }

  return "critical";
}

export function buildSavingsImpact(
  dailyKwh: number,
  tariffBrlPerKwh: number,
): EnergyRecommendationImpact {
  const safeDailyKwh = toFiniteNonNegative(dailyKwh);
  const safeTariff = toFiniteNonNegative(tariffBrlPerKwh);
  const monthlyKwh = safeDailyKwh * ESTIMATED_MONTH_DAYS;
  const monthlyBrl = monthlyKwh * safeTariff;

  return {
    dailyKwh: round(safeDailyKwh),
    monthlyKwh: round(monthlyKwh),
    monthlyBrl: round(monthlyBrl),
    annualBrl: round(monthlyBrl * ESTIMATED_YEAR_MONTHS),
  };
}

export const zeroImpact = (): EnergyRecommendationImpact => ({
  dailyKwh: 0,
  monthlyKwh: 0,
  monthlyBrl: 0,
  annualBrl: 0,
});

export function sortRecommendations(
  recommendations: readonly EnergyRecommendation[],
) {
  return recommendations.toSorted(
    (first, second) =>
      RECOMMENDATION_PRIORITY_WEIGHT[second.priority] -
        RECOMMENDATION_PRIORITY_WEIGHT[first.priority] ||
      second.impact.monthlyBrl - first.impact.monthlyBrl ||
      second.relevance - first.relevance ||
      first.id.localeCompare(second.id),
  );
}

export function sortOpportunities(
  opportunities: readonly DeviceSavingOpportunity[],
) {
  return opportunities.toSorted(
    (first, second) =>
      OPPORTUNITY_ELIGIBILITY_ORDER[first.eligibility] -
        OPPORTUNITY_ELIGIBILITY_ORDER[second.eligibility] ||
      second.opportunityScore - first.opportunityScore ||
      second.savings.monthlyBrl - first.savings.monthlyBrl ||
      second.current.consumptionPercentage -
        first.current.consumptionPercentage ||
      first.deviceName.localeCompare(second.deviceName, "pt-BR") ||
      first.deviceId.localeCompare(second.deviceId),
  );
}

export function sortAlerts(alerts: readonly EnergyAdvisorAlert[]) {
  return alerts.toSorted(
    (first, second) =>
      ALERT_SEVERITY_WEIGHT[second.severity] -
        ALERT_SEVERITY_WEIGHT[first.severity] ||
      second.estimatedImpactMonthlyBrl -
        first.estimatedImpactMonthlyBrl ||
      second.relevance - first.relevance ||
      first.id.localeCompare(second.id),
  );
}

export function calculateSavingsPotential(
  recommendations: readonly EnergyRecommendation[],
) {
  const countedGroups = new Set<string>();

  return recommendations.reduce(
    (total, recommendation) => {
      if (
        recommendation.savingsStrategy !== "cumulative" ||
        !recommendation.savingsGroupId ||
        countedGroups.has(recommendation.savingsGroupId)
      ) {
        return total;
      }

      countedGroups.add(recommendation.savingsGroupId);

      return {
        dailyKwh: total.dailyKwh + recommendation.impact.dailyKwh,
        monthlyKwh:
          total.monthlyKwh + recommendation.impact.monthlyKwh,
        monthlyBrl:
          total.monthlyBrl + recommendation.impact.monthlyBrl,
        annualBrl:
          total.annualBrl + recommendation.impact.annualBrl,
      };
    },
    zeroImpact(),
  );
}

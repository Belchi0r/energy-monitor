import type {
  EnergyEfficiencyStatus,
  EnergyRecommendationPriority,
} from "@/lib/energy/advisor/energy-advisor.types";

export const ENERGY_SCORE_THRESHOLDS = {
  efficient: 85,
  balanced: 70,
  attention: 50,
} as const;

export const ENERGY_ADVISOR_LIMITS = {
  relevantDevicePercentage: 20,
  significantConsumptionKwh: 0.75,
  minimumReducibleHours: 1,
  excessiveConcentrationPercentage: 40,
  severeConcentrationPercentage: 65,
  relevantEveningPercentage: 45,
  highEveningPercentage: 65,
  relevantPeakRatio: 2.5,
  highPeakRatio: 4.5,
  highConsumptionKwh: 2,
  maxRecommendations: 3,
  maxAlerts: 4,
  minimumFinancialSavingsMonthlyBrl: 1,
  maximumUsageReductionPercentage: 25,
} as const;

export const SCORE_DEDUCTIONS = {
  concentration: 10,
  severeConcentration: 18,
  evening: 8,
  highEvening: 15,
  relevantPeak: 6,
  elevatedPeak: 10,
  highPeak: 18,
  reductionPotential: 5,
  highConsumptionDevice: 3,
  maxHighConsumptionDevices: 3,
  suspiciousConfiguration: 8,
  maxSuspiciousConfigurations: 2,
} as const;

export const ESSENTIAL_DEVICE_NAME_FRAGMENTS = [
  "geladeira",
  "freezer",
  "refrigerador",
  "equipamento medico",
  "roteador",
] as const;

export const ESSENTIAL_DEVICE_CATEGORIES = [
  "Refrigeração",
] as const;

export const FLEXIBLE_DEVICE_CATEGORIES = [
  "Lavanderia",
  "Cozinha",
  "Eletrônicos",
  "Outros",
] as const;

export const FLEXIBLE_DEVICE_NAME_PRIORITY = [
  "maquina de lavar",
  "lava-loucas",
  "secadora",
  "carregador",
] as const;

export const GENERIC_DEVICE_NAMES = [
  "outros",
  "diversos",
  "generico",
  "sem categoria",
] as const;

export const USAGE_REDUCTION_MINUTES = {
  upToOneHour: 10,
  upToThreeHours: 30,
  upToSixHours: 30,
  aboveSixHours: 60,
} as const;

export const FRIENDLY_REDUCTION_MINUTES = [
  60,
  30,
  15,
  10,
  5,
] as const;

export const OPPORTUNITY_PRIORITY_THRESHOLDS = {
  high: 65,
  medium: 35,
} as const;

export const OPPORTUNITY_WEIGHTS = {
  maximumSavingsScore: 50,
  savingsBrlMultiplier: 2,
  consumptionShareMultiplier: 0.5,
  peakContributionMultiplier: 0.15,
  eveningContributionMultiplier: 0.1,
  confidenceMultiplier: 10,
  strategy: {
    reduce_usage: 12,
    shift_schedule: 10,
    avoid_simultaneous_use: 8,
    review_configuration: 4,
    maintain_current_usage: 0,
  },
  categoryEase: {
    Eletrônicos: 10,
    Iluminação: 10,
    Climatização: 2,
    Aquecimento: -6,
    Lavanderia: 6,
    Cozinha: 4,
    Refrigeração: -20,
    Outros: -8,
  },
  essentialPenalty: 100,
  uncertaintyPenalty: 12,
} as const;

export const OPPORTUNITY_ELIGIBILITY_ORDER = {
  eligible: 0,
  invalid_configuration: 1,
  insufficient_usage: 2,
  not_recommended: 3,
  essential: 4,
  zero_consumption: 5,
} as const;

export const DEVICE_CONFIGURATION_RANGES: Record<
  string,
  { maxPowerWatts: number; maxDailyHours: number }
> = {
  Climatização: { maxPowerWatts: 5_000, maxDailyHours: 18 },
  Aquecimento: { maxPowerWatts: 12_000, maxDailyHours: 6 },
  Refrigeração: { maxPowerWatts: 1_000, maxDailyHours: 24 },
  Lavanderia: { maxPowerWatts: 3_500, maxDailyHours: 8 },
  Iluminação: { maxPowerWatts: 1_000, maxDailyHours: 18 },
  Cozinha: { maxPowerWatts: 5_000, maxDailyHours: 12 },
  Eletrônicos: { maxPowerWatts: 2_000, maxDailyHours: 18 },
  Outros: { maxPowerWatts: 10_000, maxDailyHours: 24 },
};

export const DEFAULT_DEVICE_CONFIGURATION_RANGE = {
  maxPowerWatts: 10_000,
  maxDailyHours: 24,
} as const;

export const RECOMMENDATION_PRIORITY_WEIGHT: Record<
  EnergyRecommendationPriority,
  number
> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const ALERT_SEVERITY_WEIGHT = {
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
} as const;

export const ENERGY_STATUS_LABELS: Record<
  EnergyEfficiencyStatus,
  string
> = {
  efficient: "Consumo eficiente",
  balanced: "Consumo equilibrado",
  attention: "Consumo pede atenção",
  critical: "Revisão prioritária",
};

export const ENERGY_STATUS_DISPLAY_LABELS: Record<
  EnergyEfficiencyStatus,
  string
> = {
  efficient: "Eficiente",
  balanced: "Equilibrado",
  attention: "Atenção",
  critical: "Crítico",
};

export const ESTIMATED_MONTH_DAYS = 30;
export const ESTIMATED_YEAR_MONTHS = 12;

/**
 * Fator estritamente demonstrativo para tornar o potencial de redução
 * compreensível. Não representa medição ou certificação oficial em tempo real.
 */
export const CO2_KG_PER_KWH = 0.084;

export const CO2_SOURCE_LABEL =
  "Fator demonstrativo de 0,084 kg CO₂/kWh; não representa medição oficial em tempo real.";

import type {
  PeakContributor,
  TodayDeviceDistribution,
  TodayEnergySnapshot,
} from "@/lib/energy/energy-engine.types";

export type EnergyEfficiencyStatus =
  | "efficient"
  | "balanced"
  | "attention"
  | "critical";

export type EnergyEfficiencyReasonType =
  | "concentration"
  | "peak"
  | "evening"
  | "variation"
  | "weekend"
  | "savings"
  | "configuration"
  | "balanced";

export type EnergyEfficiencyEvidence = {
  percentage?: number;
  consumptionKwh?: number;
  deviceName?: string;
  deviceCount?: number;
  peakRatio?: number;
  comparisonPercentage?: number;
};

export type EnergyJustification = {
  id: string;
  type: EnergyEfficiencyReasonType;
  label: string;
  description: string;
  scoreImpact: number;
  scoreChange: number;
  tone: "positive" | "neutral" | "negative";
  evidence?: EnergyEfficiencyEvidence;
};

export type EnergySummary = {
  status: EnergyEfficiencyStatus;
  title: string;
  description: string;
  score: number;
  isDemonstrative: true;
  reasons: readonly EnergyJustification[];
  justifications: readonly EnergyJustification[];
};

export type EnergyHighlight = {
  id: string;
  label: string;
  value: number;
  unit: "percent" | "energy";
  description: string;
};

export type EnergyRecommendationType =
  | "reduce_usage"
  | "shift_schedule"
  | "high_concentration"
  | "peak_reduction"
  | "standby"
  | "configuration_review"
  | "balanced_usage";

export type EnergyRecommendationPriority = "low" | "medium" | "high";

export type EnergyRecommendationImpact = {
  dailyKwh: number;
  monthlyKwh: number;
  monthlyBrl: number;
  annualBrl: number;
};

export type EnergyRecommendationEvidence = {
  currentConsumptionKwh?: number;
  currentPercentage?: number;
  currentRank?: number;
  peakHour?: string;
  peakToAverageRatio?: number;
  eveningPercentage?: number;
  estimatedPeakReductionKwh?: number;
  usageReductionPercentage?: number;
  eligibilityReason?: string;
  configurationReasons?: readonly string[];
};

export type EnergyRecommendation = {
  id: string;
  type: EnergyRecommendationType;
  priority: EnergyRecommendationPriority;
  title: string;
  description: string;
  deviceId?: string;
  deviceName?: string;
  impact: EnergyRecommendationImpact;
  action?: {
    label: string;
    suggestedHoursReduction?: number;
    suggestedMinutesReduction?: number;
    suggestedPercentageReduction?: number;
    suggestedStartHour?: number;
    suggestedEndHour?: number;
  };
  evidence: EnergyRecommendationEvidence;
  savingsStrategy: "cumulative" | "alternative" | "none";
  savingsGroupId?: string;
  relevance: number;
};

export type EnergyAdvisorAlertCategory =
  | "peak"
  | "concentration"
  | "schedule"
  | "configuration"
  | "efficiency"
  | "savings";

export type EnergyAdvisorAlertSeverity =
  | "info"
  | "low"
  | "medium"
  | "high";

export type EnergyAdvisorEvidence = {
  label: string;
  value: string;
};

export type EnergyAdvisorAlert = {
  id: string;
  category: EnergyAdvisorAlertCategory;
  severity: EnergyAdvisorAlertSeverity;
  title: string;
  description: string;
  evidence: readonly EnergyAdvisorEvidence[];
  recommendationId?: string;
  dataOrigin: "estimated";
  estimatedImpactMonthlyBrl: number;
  relevance: number;
};

export type EnergySavingsPotential = EnergyRecommendationImpact;

export type DeviceSavingEligibility =
  | "eligible"
  | "essential"
  | "insufficient_usage"
  | "zero_consumption"
  | "invalid_configuration"
  | "not_recommended";

export type DeviceSavingStrategy =
  | "reduce_usage"
  | "shift_schedule"
  | "avoid_simultaneous_use"
  | "review_configuration"
  | "maintain_current_usage";

export type DeviceSavingOpportunity = {
  id: string;
  deviceId: string;
  deviceName: string;
  category: string;
  eligibility: DeviceSavingEligibility;
  strategy: DeviceSavingStrategy;
  priority: EnergyRecommendationPriority;
  opportunityScore: number;
  confidence: number;
  current: {
    dailyConsumptionKwh: number;
    consumptionPercentage: number;
    averageDailyHours: number;
    powerWatts: number;
    currentRank: number;
  };
  suggestion?: {
    hoursReduction?: number;
    minutesReduction?: number;
    percentageReduction?: number;
    preferredStartHour?: number;
    preferredEndHour?: number;
  };
  savings: EnergyRecommendationImpact;
  evidence: {
    reason: string;
    configurationReasons?: readonly string[];
    peakContributionPercentage?: number;
    eveningConsumptionPercentage?: number;
    currentRank: number;
  };
  savingsGroupId?: string;
  exclusivityGroup?: string;
  cumulative: boolean;
};

export type EnvironmentalImpact = {
  monthlyCo2KgAvoided: number;
  annualCo2KgAvoided: number;
  sourceLabel: string;
  isDemonstrative: true;
};

export type EnergyAnalysis = {
  summary: EnergySummary;
  highlights: readonly EnergyHighlight[];
  recommendations: readonly EnergyRecommendation[];
  opportunities: readonly DeviceSavingOpportunity[];
  alerts: readonly EnergyAdvisorAlert[];
  primaryRecommendationSavings: EnergySavingsPotential;
  combinedSavingsPotential: EnergySavingsPotential;
  financialOpportunityCount: number;
  /** Mantido como alias do potencial combinado para consumidores existentes. */
  savingsPotential: EnergySavingsPotential;
  environmentalImpact?: EnvironmentalImpact;
  dataOrigin: "estimated";
};

export type EnergyAdvisorOptions = {
  tariffBrlPerKwh?: number;
  includeEnvironmentalImpact?: boolean;
};

export type SuspiciousDevice = {
  device: TodayDeviceDistribution;
  reasons: readonly string[];
};

export type EnergyAdvisorContext = {
  snapshot: TodayEnergySnapshot;
  tariffBrlPerKwh: number;
  leader?: TodayDeviceDistribution;
  reductionCandidate?: TodayDeviceDistribution;
  eveningCandidate?: TodayDeviceDistribution;
  eveningCandidateConsumptionKwh: number;
  peakFlexibleContributor?: PeakContributor;
  peakToAverageRatio: number;
  highConsumptionDeviceCount: number;
  suspiciousDevices: readonly SuspiciousDevice[];
};

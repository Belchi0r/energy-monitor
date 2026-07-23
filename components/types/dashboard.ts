export type DashboardPeriod = "today" | "7d" | "30d";

export type DashboardDatasetId =
  | "today"
  | "yesterday"
  | "last7Days"
  | "previous7Days"
  | "last30Days"
  | "previous30Days";

export type TemporalGranularity = "twoHours" | "day";

export type MetricId =
  | "currentPower"
  | "periodConsumption"
  | "dailyAverage"
  | "estimatedCost"
  | "activeDevices"
  | "topDevice";

export type MetricFormat = "power" | "energy" | "currency" | "integer";

export type VariationDirection = "increase" | "decrease" | "stable";
export type VariationSignificance = "stable" | "moderate" | "relevant";

export type NumericComparison = {
  previousValue: number;
  absoluteChange: number;
  percentageChange: number | null;
  direction: VariationDirection;
  significance: VariationSignificance;
  previousLabel: string;
  message: string;
};

export type DashboardMetric = {
  id: MetricId;
  title: string;
  value: number;
  format: MetricFormat;
  description: string;
  comparison?: NumericComparison;
};

export type TemporalUsagePoint = {
  id: string;
  label: string;
  shortLabel: string;
  consumptionKwh: number;
  isWeekend?: boolean;
};

export type AlignedTemporalPoint = {
  id: string;
  index: number;
  axisLabel: string;
  currentLabel: string;
  previousLabel?: string;
  currentKwh: number;
  previousKwh?: number;
  isWeekend?: boolean;
};

export type DeviceConsumption = {
  id: string;
  device: string;
  description: string;
  consumptionKwh: number;
};

export type ActivityStatus = "active" | "completed" | "attention";

export type RecentActivity = {
  id: string;
  device: string;
  event: string;
  occurredAt: string;
  occurredAtIso: string;
  status: ActivityStatus;
};

export type DashboardDataset = {
  id: DashboardDatasetId;
  label: string;
  rangeLabel: string;
  daysCount: number;
  granularity: TemporalGranularity;
  currentPowerW?: number;
  activeDevices: number;
  energyUsage: readonly TemporalUsagePoint[];
  deviceConsumption: readonly DeviceConsumption[];
  recentActivities: readonly RecentActivity[];
};

export type DashboardPeriodDefinition = {
  period: DashboardPeriod;
  currentDatasetId: DashboardDatasetId;
  previousDatasetId: DashboardDatasetId;
  label: string;
  shortLabel: string;
  comparisonLabel: string;
  chartTitle: string;
  chartDescription: string;
  averageLabel: string;
  pointNoun: string;
  activityTimeLabel: string;
};

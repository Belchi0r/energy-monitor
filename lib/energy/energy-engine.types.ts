import type { UsageProfileType } from "@/lib/energy/usage-profiles";

export type EnergyDevice = {
  id: string;
  name: string;
  category: string;
  powerWatts: number;
  averageDailyHours: number;
  status: "active" | "inactive";
  usageProfileType?: unknown;
  usageWindows?: unknown;
  usageProfileFallbackUsed?: boolean;
};

export type TodayDeviceDistribution = {
  deviceId: string;
  name: string;
  category: string;
  powerWatts: number;
  averageDailyHours: number;
  consumptionKwh: number;
  percentage: number;
  ranking: number;
  usageProfileType: UsageProfileType;
  usageProfileFallbackUsed: boolean;
};

export type TodayTimelinePoint = {
  hour: string;
  consumptionKwh: number;
};

export type DeviceTimelineEntry = {
  deviceId: string;
  name: string;
  category: string;
  totalConsumptionKwh: number;
  intervals: readonly TodayTimelinePoint[];
};

export type TimelineContributor = {
  deviceId: string;
  name: string;
  consumptionKwh: number;
  percentageOfInterval: number;
};

export type IntervalContributors = {
  hour: string;
  totalConsumptionKwh: number;
  contributors: readonly TimelineContributor[];
};

export type PeakContributor = {
  deviceId: string;
  name: string;
  consumptionKwh: number;
  percentageOfPeak: number;
};

export type TodayEnergyMetrics = {
  peakHour: string | null;
  peakConsumptionKwh: number;
  minimumHour: string | null;
  minimumConsumptionKwh: number;
  averageConsumptionKwh: number;
  eveningConsumptionKwh: number;
  eveningPercentage: number;
};

export type TodayEnergySnapshot = {
  activeDeviceCount: number;
  totalConsumptionKwh: number;
  estimatedDailyCost: number;
  estimatedMonthlyConsumptionKwh: number;
  estimatedMonthlyCost: number;
  distribution: readonly TodayDeviceDistribution[];
  deviceTimelines: readonly DeviceTimelineEntry[];
  timeline: readonly TodayTimelinePoint[];
  contributorsByInterval: readonly IntervalContributors[];
  peakContributors: readonly PeakContributor[];
  metrics: TodayEnergyMetrics;
};

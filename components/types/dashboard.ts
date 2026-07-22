export type MetricId =
  | "currentPower"
  | "dailyConsumption"
  | "estimatedCost"
  | "activeDevices";

export type MetricFormat = "power" | "energy" | "currency" | "integer";

export type DashboardMetric = {
  id: MetricId;
  title: string;
  value: number;
  format: MetricFormat;
  description: string;
};

export type EnergyUsagePoint = {
  time: string;
  consumptionKwh: number;
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
  time: string;
  status: ActivityStatus;
};

export type DashboardData = {
  metrics: readonly DashboardMetric[];
  energyUsage: readonly EnergyUsagePoint[];
  deviceConsumption: readonly DeviceConsumption[];
  recentActivities: readonly RecentActivity[];
};

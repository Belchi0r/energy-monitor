export type AlertSeverity = "info" | "low" | "medium" | "high";

export type AlertSource = "system" | "device" | "comparison";

export type AlertCategory =
  | "peak"
  | "device"
  | "comparison"
  | "distribution"
  | "trend";

export type DashboardAlert = {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  createdAt: string;
  source: AlertSource;
};

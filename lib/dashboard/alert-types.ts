export type AlertSeverity = "info" | "low" | "medium" | "high";

export type AlertSource =
  | "system"
  | "device"
  | "comparison"
  | "advisor";

export type AlertCategory =
  | "peak"
  | "device"
  | "comparison"
  | "distribution"
  | "trend"
  | "concentration"
  | "schedule"
  | "configuration"
  | "efficiency"
  | "savings";

export type DashboardAlertEvidence = {
  label: string;
  value: string;
};

export type DashboardAlert = {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  createdAt: string;
  source: AlertSource;
  dataOrigin: "estimated" | "simulated";
  evidence?: readonly DashboardAlertEvidence[];
  recommendationId?: string;
};

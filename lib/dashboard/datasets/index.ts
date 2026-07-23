import type {
  DashboardDataset,
  DashboardDatasetId,
} from "@/lib/dashboard/types";
import {
  last30DaysDataset,
  previous30DaysDataset,
} from "@/lib/dashboard/datasets/month";
import {
  todayDataset,
  yesterdayDataset,
} from "@/lib/dashboard/datasets/today";
import {
  last7DaysDataset,
  previous7DaysDataset,
} from "@/lib/dashboard/datasets/week";

export const dashboardDatasets = {
  today: todayDataset,
  yesterday: yesterdayDataset,
  last7Days: last7DaysDataset,
  previous7Days: previous7DaysDataset,
  last30Days: last30DaysDataset,
  previous30Days: previous30DaysDataset,
} satisfies Record<DashboardDatasetId, DashboardDataset>;

export function getDashboardDataset(id: DashboardDatasetId): DashboardDataset {
  return dashboardDatasets[id];
}

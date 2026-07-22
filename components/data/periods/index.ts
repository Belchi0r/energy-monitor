import type {
  DashboardDataset,
  DashboardDatasetId,
} from "@/components/types/dashboard";
import { last30DaysDataset, previous30DaysDataset } from "./month";
import { todayDataset, yesterdayDataset } from "./today";
import { last7DaysDataset, previous7DaysDataset } from "./week";

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

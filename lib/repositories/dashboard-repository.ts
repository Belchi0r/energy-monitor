import type {
  DashboardDataset,
  DashboardDatasetId,
} from "@/lib/dashboard/types";

export interface DashboardRepository {
  getDataset(id: DashboardDatasetId): Promise<DashboardDataset>;
}

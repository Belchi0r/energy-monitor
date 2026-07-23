import { validateDashboardDataset } from "@/lib/dashboard/comparison";
import {
  dashboardDatasets,
  getDashboardDataset,
} from "@/lib/dashboard/datasets";
import type { DashboardDatasetId } from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";

Object.values(dashboardDatasets).forEach(validateDashboardDataset);

export class MockDashboardRepository implements DashboardRepository {
  async getDataset(id: DashboardDatasetId) {
    return getDashboardDataset(id);
  }
}

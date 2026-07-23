import { MockDashboardRepository } from "@/lib/repositories/mock-dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";

const dashboardRepository = new MockDashboardRepository();

export const dashboardService = new DashboardService(dashboardRepository);

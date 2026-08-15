import { prisma } from "@/lib/prisma";
import { deviceService } from "@/lib/devices/application";
import { energyHistoryService } from "@/lib/history-application";
import { PrismaDashboardRepository } from "@/lib/repositories/prisma-dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";

const dashboardRepository = new PrismaDashboardRepository(prisma);

export const dashboardService = new DashboardService(
  dashboardRepository,
  deviceService,
  energyHistoryService,
);

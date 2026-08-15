import "server-only";

import { prisma } from "@/lib/prisma";
import { PrismaEnergyHistoryRepository } from "@/lib/repositories/prisma-energy-history-repository";
import { EnergyHistoryService } from "@/lib/services/energy-history-service";

export const energyHistoryRepository =
  new PrismaEnergyHistoryRepository(prisma);

export const energyHistoryService = new EnergyHistoryService(
  energyHistoryRepository,
);

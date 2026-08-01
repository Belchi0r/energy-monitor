import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { validateDashboardDataset } from "../lib/dashboard/comparison";
import { dashboardDatasets } from "../lib/dashboard/datasets";
import { demoDevices } from "../lib/devices/demo-devices";
import {
  buildDeviceSeedUpserts,
  notebookSeedProfile,
} from "../lib/devices/device-seed";
import type {
  DashboardDataset,
  RecentActivity,
} from "../lib/dashboard/types";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("A variável DIRECT_URL não foi encontrada.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function parseOccurredAt(activity: RecentActivity) {
  const occurredAt = new Date(activity.occurredAtIso);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error(
      `Data inválida na atividade "${activity.id}": "${activity.occurredAtIso}".`,
    );
  }

  return occurredAt;
}

async function main() {
  const datasets: readonly DashboardDataset[] =
    Object.values(dashboardDatasets);

  datasets.forEach(validateDashboardDataset);

  await prisma.$transaction(
    [
      ...buildDeviceSeedUpserts().map((operation) =>
        prisma.device.upsert(operation),
      ),
      prisma.device.updateMany({
        where: {
          name: {
            contains: "notebook",
            mode: "insensitive",
          },
        },
        data: {
          usageProfileType: notebookSeedProfile.usageProfileType,
          usageWindows: notebookSeedProfile.usageWindows.map(
            (window) => ({ ...window }),
          ),
        },
      }),
      ...datasets.map((dataset) => {
        const energyUsage = dataset.energyUsage.map((point) => ({
          id: point.id,
          label: point.label,
          shortLabel: point.shortLabel,
          consumptionKwh: point.consumptionKwh,
          isWeekend: point.isWeekend ?? null,
        }));
        const deviceUsage = dataset.deviceConsumption.map((device) => ({
          id: device.id,
          device: device.device,
          description: device.description,
          consumptionKwh: device.consumptionKwh,
        }));
        const activities = dataset.recentActivities.map((activity) => ({
          id: activity.id,
          device: activity.device,
          event: activity.event,
          occurredAt: activity.occurredAt,
          occurredAtIso: parseOccurredAt(activity),
          status: activity.status,
        }));
        const datasetFields = {
          label: dataset.label,
          rangeLabel: dataset.rangeLabel,
          daysCount: dataset.daysCount,
          granularity: dataset.granularity,
          currentPowerW: dataset.currentPowerW ?? null,
          activeDevices: dataset.activeDevices,
        };

        return prisma.dashboardDataset.upsert({
          where: {
            id: dataset.id,
          },
          update: {
            ...datasetFields,
            energyUsage: {
              deleteMany: {},
              create: energyUsage,
            },
            deviceUsage: {
              deleteMany: {},
              create: deviceUsage,
            },
            activities: {
              deleteMany: {},
              create: activities,
            },
          },
          create: {
            id: dataset.id,
            ...datasetFields,
            energyUsage: {
              create: energyUsage,
            },
            deviceUsage: {
              create: deviceUsage,
            },
            activities: {
              create: activities,
            },
          },
        });
      }),
    ],
    {
      timeout: 30_000,
    },
  );

  const energyPointCount = datasets.reduce(
    (total, dataset) => total + dataset.energyUsage.length,
    0,
  );
  const deviceCount = datasets.reduce(
    (total, dataset) => total + dataset.deviceConsumption.length,
    0,
  );
  const activityCount = datasets.reduce(
    (total, dataset) => total + dataset.recentActivities.length,
    0,
  );

  console.log(
    `Seed concluído: ${demoDevices.length} dispositivos cadastrados, ${datasets.length} datasets, ${energyPointCount} pontos de consumo, ${deviceCount} snapshots por dispositivo e ${activityCount} atividades.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

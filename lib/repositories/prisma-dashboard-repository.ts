import type {
  DashboardDataset as PersistedDashboardDataset,
  DeviceConsumption as PersistedDeviceConsumption,
  EnergyUsagePoint as PersistedEnergyUsagePoint,
  PrismaClient,
  RecentActivity as PersistedRecentActivity,
} from "@/generated/prisma/client";
import { validateDashboardDataset } from "@/lib/dashboard/comparison";
import type {
  ActivityStatus,
  DashboardDataset,
  DashboardDatasetId,
  TemporalGranularity,
} from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";

type PersistedDatasetWithRelations = PersistedDashboardDataset & {
  energyUsage: PersistedEnergyUsagePoint[];
  deviceUsage: PersistedDeviceConsumption[];
  activities: PersistedRecentActivity[];
};

function getTemporalPosition(id: string) {
  const match = id.match(/(\d+)(?:h)?$/);

  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function parseGranularity(value: string): TemporalGranularity {
  if (value === "twoHours" || value === "day") {
    return value;
  }

  throw new Error(`Granularidade da dashboard inválida: "${value}".`);
}

function parseActivityStatus(value: string): ActivityStatus {
  if (
    value === "active" ||
    value === "completed" ||
    value === "attention"
  ) {
    return value;
  }

  throw new Error(`Status de atividade inválido: "${value}".`);
}

function toDomainDataset(
  id: DashboardDatasetId,
  persisted: PersistedDatasetWithRelations,
): DashboardDataset {
  const dataset: DashboardDataset = {
    id,
    label: persisted.label,
    rangeLabel: persisted.rangeLabel,
    daysCount: persisted.daysCount,
    granularity: parseGranularity(persisted.granularity),
    currentPowerW: persisted.currentPowerW ?? undefined,
    activeDevices: persisted.activeDevices,
    energyUsage: [...persisted.energyUsage]
      .sort(
        (first, second) =>
          getTemporalPosition(first.id) -
            getTemporalPosition(second.id) ||
          first.id.localeCompare(second.id),
      )
      .map((point) => ({
        id: point.id,
        label: point.label,
        shortLabel: point.shortLabel,
        consumptionKwh: point.consumptionKwh,
        isWeekend: point.isWeekend ?? undefined,
      })),
    deviceConsumption: persisted.deviceUsage.map((device) => ({
      id: device.id,
      device: device.device,
      description: device.description,
      consumptionKwh: device.consumptionKwh,
    })),
    recentActivities: persisted.activities.map((activity) => ({
      id: activity.id,
      device: activity.device,
      event: activity.event,
      occurredAt: activity.occurredAt,
      occurredAtIso: activity.occurredAtIso.toISOString(),
      status: parseActivityStatus(activity.status),
    })),
  };

  validateDashboardDataset(dataset);

  return dataset;
}

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly client: PrismaClient) {}

  async getDataset(id: DashboardDatasetId): Promise<DashboardDataset> {
    const persisted = await this.client.dashboardDataset.findUnique({
      where: {
        id,
      },
      include: {
        energyUsage: true,
        deviceUsage: {
          orderBy: [
            {
              consumptionKwh: "desc",
            },
            {
              id: "asc",
            },
          ],
        },
        activities: {
          orderBy: [
            {
              occurredAtIso: "desc",
            },
            {
              id: "asc",
            },
          ],
        },
      },
    });

    if (!persisted) {
      throw new Error(`Dataset da dashboard não encontrado: "${id}".`);
    }

    return toDomainDataset(id, persisted);
  }
}

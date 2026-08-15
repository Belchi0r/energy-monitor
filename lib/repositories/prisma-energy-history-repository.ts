import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  calendarDateKeyToPrismaDate,
  prismaDateToCalendarDateKey,
  type CalendarDateKey,
} from "@/lib/history-calendar";
import type {
  DailyEnergySnapshotInput,
  DailyEnergySnapshotRecord,
} from "@/lib/history-types";
import type { EnergyHistoryRepository } from "@/lib/repositories/energy-history-repository";

function toDomainSnapshot(
  persisted: PersistedSnapshot,
): DailyEnergySnapshotRecord {
  return {
    id: persisted.id,
    userId: persisted.userId,
    snapshotDate: prismaDateToCalendarDateKey(
      persisted.snapshotDate,
    ),
    totalConsumptionKwh: persisted.totalConsumptionKwh,
    estimatedCost: persisted.estimatedCost,
    activeDeviceCount: persisted.activeDeviceCount,
    tariffBrlPerKwh: persisted.tariffBrlPerKwh,
    devices: persisted.devices.map((device) => ({
      id: device.id,
      snapshotId: device.snapshotId,
      deviceId: device.deviceId,
      deviceNameSnapshot: device.deviceNameSnapshot,
      estimatedConsumptionKwh: device.estimatedConsumptionKwh,
      estimatedCost: device.estimatedCost,
      active: device.active,
      createdAt: device.createdAt,
    })),
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
  };
}

function createDeviceRows(input: DailyEnergySnapshotInput) {
  return input.devices.map((device) => ({ ...device }));
}

const snapshotInclude = {
  devices: {
    orderBy: [
      { estimatedConsumptionKwh: "desc" },
      { deviceId: "asc" },
    ],
  },
} satisfies Prisma.DailyEnergySnapshotInclude;

type PersistedSnapshot = Prisma.DailyEnergySnapshotGetPayload<{
  include: typeof snapshotInclude;
}>;

export class PrismaEnergyHistoryRepository
  implements EnergyHistoryRepository
{
  constructor(private readonly client: PrismaClient) {}

  async upsertDailySnapshot(
    userId: string,
    snapshotDate: CalendarDateKey,
    input: DailyEnergySnapshotInput,
  ) {
    const persisted = await this.client.dailyEnergySnapshot.upsert({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate: calendarDateKeyToPrismaDate(snapshotDate),
        },
      },
      create: {
        userId,
        snapshotDate: calendarDateKeyToPrismaDate(snapshotDate),
        totalConsumptionKwh: input.totalConsumptionKwh,
        estimatedCost: input.estimatedCost,
        activeDeviceCount: input.activeDeviceCount,
        tariffBrlPerKwh: input.tariffBrlPerKwh,
        devices: { create: createDeviceRows(input) },
      },
      update: {
        totalConsumptionKwh: input.totalConsumptionKwh,
        estimatedCost: input.estimatedCost,
        activeDeviceCount: input.activeDeviceCount,
        tariffBrlPerKwh: input.tariffBrlPerKwh,
        devices: {
          deleteMany: {},
          create: createDeviceRows(input),
        },
      },
      include: snapshotInclude,
    });

    return toDomainSnapshot(persisted);
  }

  async findByDate(
    userId: string,
    snapshotDate: CalendarDateKey,
  ) {
    const persisted = await this.client.dailyEnergySnapshot.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate: calendarDateKeyToPrismaDate(snapshotDate),
        },
      },
      include: snapshotInclude,
    });

    return persisted ? toDomainSnapshot(persisted) : null;
  }

  async findBetween(
    userId: string,
    startDate: CalendarDateKey,
    endDate: CalendarDateKey,
  ) {
    const persisted = await this.client.dailyEnergySnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: calendarDateKeyToPrismaDate(startDate),
          lte: calendarDateKeyToPrismaDate(endDate),
        },
      },
      orderBy: { snapshotDate: "asc" },
      include: snapshotInclude,
    });

    return persisted.map(toDomainSnapshot);
  }

  async findEarliest(userId: string) {
    const persisted = await this.client.dailyEnergySnapshot.findFirst({
      where: { userId },
      orderBy: { snapshotDate: "asc" },
      include: snapshotInclude,
    });

    return persisted ? toDomainSnapshot(persisted) : null;
  }

  async findLatest(userId: string) {
    const persisted = await this.client.dailyEnergySnapshot.findFirst({
      where: { userId },
      orderBy: { snapshotDate: "desc" },
      include: snapshotInclude,
    });

    return persisted ? toDomainSnapshot(persisted) : null;
  }
}

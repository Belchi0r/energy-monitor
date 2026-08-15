import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { DailyEnergySnapshotInput } from "@/lib/history-types";
import { PrismaEnergyHistoryRepository } from "@/lib/repositories/prisma-energy-history-repository";
import { TEST_USER_ID } from "@/tests/device-test-helpers";

const snapshotDate = new Date("2026-08-10T00:00:00.000Z");
const createdAt = new Date("2026-08-10T15:00:00.000Z");
const input: DailyEnergySnapshotInput = {
  totalConsumptionKwh: 4.5,
  estimatedCost: 4.14,
  activeDeviceCount: 1,
  tariffBrlPerKwh: 0.92,
  devices: [
    {
      deviceId: "device-owned",
      deviceNameSnapshot: "Televisor",
      estimatedConsumptionKwh: 4.5,
      estimatedCost: 4.14,
      active: true,
    },
  ],
};
const persistedSnapshot = {
  id: "snapshot-owned",
  userId: TEST_USER_ID,
  snapshotDate,
  totalConsumptionKwh: input.totalConsumptionKwh,
  estimatedCost: input.estimatedCost,
  activeDeviceCount: input.activeDeviceCount,
  tariffBrlPerKwh: input.tariffBrlPerKwh,
  createdAt,
  updatedAt: createdAt,
  devices: [
    {
      id: "snapshot-device-owned",
      snapshotId: "snapshot-owned",
      ...input.devices[0],
      createdAt,
    },
  ],
};

function createSubject() {
  const delegate = {
    upsert: vi.fn().mockResolvedValue(persistedSnapshot),
    findUnique: vi.fn().mockResolvedValue(persistedSnapshot),
    findMany: vi.fn().mockResolvedValue([persistedSnapshot]),
    findFirst: vi.fn().mockResolvedValue(persistedSnapshot),
  };
  const client = {
    dailyEnergySnapshot: delegate,
  } as unknown as PrismaClient;

  return {
    delegate,
    repository: new PrismaEnergyHistoryRepository(client),
  };
}

describe("PrismaEnergyHistoryRepository", () => {
  it("faz upsert atômico por usuário e dia, substituindo somente os detalhes atuais", async () => {
    const { delegate, repository } = createSubject();

    const snapshot = await repository.upsertDailySnapshot(
      TEST_USER_ID,
      "2026-08-10",
      input,
    );

    expect(delegate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_snapshotDate: {
            userId: TEST_USER_ID,
            snapshotDate,
          },
        },
        create: expect.objectContaining({
          userId: TEST_USER_ID,
          snapshotDate,
          devices: { create: input.devices },
        }),
        update: expect.objectContaining({
          devices: {
            deleteMany: {},
            create: input.devices,
          },
        }),
        include: expect.objectContaining({ devices: expect.any(Object) }),
      }),
    );
    expect(snapshot.snapshotDate).toBe("2026-08-10");
    expect(snapshot.userId).toBe(TEST_USER_ID);
    expect(snapshot.devices[0].deviceNameSnapshot).toBe("Televisor");
  });

  it("mantém userId em todas as leituras de snapshots", async () => {
    const { delegate, repository } = createSubject();

    await repository.findByDate(TEST_USER_ID, "2026-08-10");
    await repository.findBetween(
      TEST_USER_ID,
      "2026-08-04",
      "2026-08-10",
    );
    await repository.findEarliest(TEST_USER_ID);

    expect(delegate.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_snapshotDate: {
            userId: TEST_USER_ID,
            snapshotDate,
          },
        },
      }),
    );
    expect(delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: TEST_USER_ID,
          snapshotDate: {
            gte: new Date("2026-08-04T00:00:00.000Z"),
            lte: snapshotDate,
          },
        },
        orderBy: { snapshotDate: "asc" },
      }),
    );
    expect(delegate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID },
        orderBy: { snapshotDate: "asc" },
      }),
    );
  });
});

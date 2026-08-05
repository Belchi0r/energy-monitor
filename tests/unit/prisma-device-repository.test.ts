import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { DeviceInput } from "@/lib/devices/types";
import { DeviceRepositoryNameConflictError } from "@/lib/repositories/device-repository";
import { PrismaDeviceRepository } from "@/lib/repositories/prisma-device-repository";
import { TEST_USER_ID } from "@/tests/device-test-helpers";

const deviceId = "device-owned";
const input: DeviceInput = {
  name: "Televisor",
  category: "Eletrônicos",
  powerWatts: 180,
  averageDailyHours: 4,
  status: "active",
  usageProfileType: "SPLIT",
  usageWindows: [
    { startHour: 8, endHour: 12, weight: 0.5 },
    { startHour: 14, endHour: 18, weight: 0.5 },
  ],
};
const persistedDevice = {
  id: deviceId,
  userId: TEST_USER_ID,
  ...input,
  createdAt: new Date("2026-08-05T12:00:00.000Z"),
  updatedAt: new Date("2026-08-05T12:00:00.000Z"),
};

function createSubject() {
  const delegate = {
    findMany: vi.fn().mockResolvedValue([persistedDevice]),
    findFirst: vi.fn().mockResolvedValue(persistedDevice),
    create: vi.fn().mockResolvedValue(persistedDevice),
    update: vi.fn().mockResolvedValue(persistedDevice),
    delete: vi.fn().mockResolvedValue(persistedDevice),
  };
  const client = { device: delegate } as unknown as PrismaClient;

  return {
    delegate,
    repository: new PrismaDeviceRepository(client),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PrismaDeviceRepository", () => {
  it("inclui userId em todas as consultas e mutações", async () => {
    const { delegate, repository } = createSubject();

    await repository.findAll(TEST_USER_ID);
    await repository.findById(TEST_USER_ID, deviceId);
    await repository.findByName(TEST_USER_ID, input.name);
    await repository.create(TEST_USER_ID, input);
    await repository.update(TEST_USER_ID, deviceId, input);
    await repository.delete(TEST_USER_ID, deviceId);

    expect(delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: TEST_USER_ID } }),
    );
    expect(delegate.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: deviceId, userId: TEST_USER_ID },
      }),
    );
    expect(delegate.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          userId: TEST_USER_ID,
          name: { equals: input.name, mode: "insensitive" },
        },
      }),
    );
    expect(delegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: TEST_USER_ID }),
      }),
    );
    expect(delegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: deviceId, userId: TEST_USER_ID },
      }),
    );
    expect(delegate.delete).toHaveBeenCalledWith({
      where: { id: deviceId, userId: TEST_USER_ID },
    });
  });

  it("converte conflito P2002 em erro de domínio do repositório", async () => {
    const { delegate, repository } = createSubject();
    delegate.create.mockRejectedValueOnce({ code: "P2002" });

    await expect(
      repository.create(TEST_USER_ID, input),
    ).rejects.toBeInstanceOf(DeviceRepositoryNameConflictError);
  });
});

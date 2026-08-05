import { describe, expect, it } from "vitest";

import {
  buildDeviceSeedUpserts,
  type DeviceSeedEntry,
} from "@/lib/devices/device-seed";

const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";

function applySeed(
  current: ReadonlyMap<string, DeviceSeedEntry>,
): Map<string, DeviceSeedEntry> {
  const next = new Map(current);

  for (const operation of buildDeviceSeedUpserts(TEST_USER_ID)) {
    const existing = next.get(operation.where.id);

    next.set(operation.where.id, {
      id: operation.where.id,
      userId: operation.where.userId,
      ...(existing ? operation.update : operation.create),
    });
  }

  return next;
}

describe("seed de dispositivos", () => {
  it("é idempotente e não multiplica registros", () => {
    const firstRun = applySeed(new Map());
    const secondRun = applySeed(firstRun);

    expect(secondRun.size).toBe(firstRun.size);
    expect([...secondRun.values()]).toEqual([...firstRun.values()]);
  });
});

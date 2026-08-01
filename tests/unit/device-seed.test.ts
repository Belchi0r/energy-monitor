import { describe, expect, it } from "vitest";

import {
  buildDeviceSeedUpserts,
  type DeviceSeedEntry,
} from "@/lib/devices/device-seed";

function applySeed(
  current: ReadonlyMap<string, DeviceSeedEntry>,
): Map<string, DeviceSeedEntry> {
  const next = new Map(current);

  for (const operation of buildDeviceSeedUpserts()) {
    const existing = next.get(operation.where.id);

    next.set(operation.where.id, {
      id: operation.where.id,
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

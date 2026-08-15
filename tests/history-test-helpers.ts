import type { CalendarDateKey } from "@/lib/history-calendar";
import type {
  DailyEnergySnapshotInput,
  DailyEnergySnapshotRecord,
} from "@/lib/history-types";
import type { EnergyHistoryRepository } from "@/lib/repositories/energy-history-repository";

export class InMemoryEnergyHistoryRepository
  implements EnergyHistoryRepository
{
  readonly upsertCalls: Array<{
    userId: string;
    snapshotDate: CalendarDateKey;
  }> = [];
  private nextId = 1;

  constructor(
    private snapshots: DailyEnergySnapshotRecord[] = [],
  ) {}

  async upsertDailySnapshot(
    userId: string,
    snapshotDate: CalendarDateKey,
    input: DailyEnergySnapshotInput,
  ) {
    this.upsertCalls.push({ userId, snapshotDate });
    const existing = this.snapshots.find(
      (snapshot) =>
        snapshot.userId === userId &&
        snapshot.snapshotDate === snapshotDate,
    );
    const now = new Date(`${snapshotDate}T15:00:00.000Z`);
    const snapshotId = existing?.id ?? `snapshot-${this.nextId++}`;
    const persisted: DailyEnergySnapshotRecord = {
      id: snapshotId,
      userId,
      snapshotDate,
      totalConsumptionKwh: input.totalConsumptionKwh,
      estimatedCost: input.estimatedCost,
      activeDeviceCount: input.activeDeviceCount,
      tariffBrlPerKwh: input.tariffBrlPerKwh,
      devices: input.devices.map((device, index) => ({
        ...device,
        id: `${snapshotId}-device-${index + 1}`,
        snapshotId,
        createdAt: existing?.createdAt ?? now,
      })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.snapshots = existing
      ? this.snapshots.map((snapshot) =>
          snapshot.id === existing.id ? persisted : snapshot,
        )
      : [...this.snapshots, persisted];

    return structuredClone(persisted);
  }

  async findByDate(
    userId: string,
    snapshotDate: CalendarDateKey,
  ) {
    const snapshot = this.snapshots.find(
      (item) =>
        item.userId === userId &&
        item.snapshotDate === snapshotDate,
    );

    return snapshot ? structuredClone(snapshot) : null;
  }

  async findBetween(
    userId: string,
    startDate: CalendarDateKey,
    endDate: CalendarDateKey,
  ) {
    return this.snapshots
      .filter(
        (snapshot) =>
          snapshot.userId === userId &&
          snapshot.snapshotDate >= startDate &&
          snapshot.snapshotDate <= endDate,
      )
      .toSorted((first, second) =>
        first.snapshotDate.localeCompare(second.snapshotDate),
      )
      .map((snapshot) => structuredClone(snapshot));
  }

  async findEarliest(userId: string) {
    const snapshot = this.snapshots
      .filter((item) => item.userId === userId)
      .toSorted((first, second) =>
        first.snapshotDate.localeCompare(second.snapshotDate),
      )[0];

    return snapshot ? structuredClone(snapshot) : null;
  }

  getAll(userId: string) {
    return this.snapshots
      .filter((snapshot) => snapshot.userId === userId)
      .map((snapshot) => structuredClone(snapshot));
  }
}

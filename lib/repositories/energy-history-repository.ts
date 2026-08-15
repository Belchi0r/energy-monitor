import type { CalendarDateKey } from "@/lib/history-calendar";
import type {
  DailyEnergySnapshotInput,
  DailyEnergySnapshotRecord,
} from "@/lib/history-types";

export interface EnergyHistoryRepository {
  upsertDailySnapshot(
    userId: string,
    snapshotDate: CalendarDateKey,
    input: DailyEnergySnapshotInput,
  ): Promise<DailyEnergySnapshotRecord>;
  findByDate(
    userId: string,
    snapshotDate: CalendarDateKey,
  ): Promise<DailyEnergySnapshotRecord | null>;
  findBetween(
    userId: string,
    startDate: CalendarDateKey,
    endDate: CalendarDateKey,
  ): Promise<readonly DailyEnergySnapshotRecord[]>;
  findEarliest(
    userId: string,
  ): Promise<DailyEnergySnapshotRecord | null>;
}

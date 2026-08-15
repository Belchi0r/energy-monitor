import type { CalendarDateKey } from "@/lib/history-calendar";

export type DailyDeviceEnergySnapshotInput = {
  deviceId: string;
  deviceNameSnapshot: string;
  estimatedConsumptionKwh: number;
  estimatedCost: number;
  active: boolean;
};

export type DailyEnergySnapshotInput = {
  totalConsumptionKwh: number;
  estimatedCost: number;
  activeDeviceCount: number;
  tariffBrlPerKwh: number;
  devices: readonly DailyDeviceEnergySnapshotInput[];
};

export type DailyDeviceEnergySnapshotRecord =
  DailyDeviceEnergySnapshotInput & {
    id: string;
    snapshotId: string;
    createdAt: Date;
  };

export type DailyEnergySnapshotRecord =
  Omit<DailyEnergySnapshotInput, "devices"> & {
    id: string;
    userId: string;
    snapshotDate: CalendarDateKey;
    devices: readonly DailyDeviceEnergySnapshotRecord[];
    createdAt: Date;
    updatedAt: Date;
  };

export type EnergyHistoryCoverage = {
  expectedDays: number;
  currentAvailableDays: number;
  previousAvailableDays: number;
  currentComplete: boolean;
  previousComplete: boolean;
  comparisonAvailable: boolean;
  earliestSnapshotDate?: CalendarDateKey;
};

export type EnergyHistoryPeriod = {
  referenceDate: CalendarDateKey;
  currentStartDate: CalendarDateKey;
  currentEndDate: CalendarDateKey;
  previousStartDate: CalendarDateKey;
  previousEndDate: CalendarDateKey;
  current: readonly DailyEnergySnapshotRecord[];
  previous: readonly DailyEnergySnapshotRecord[];
  coverage: EnergyHistoryCoverage;
};

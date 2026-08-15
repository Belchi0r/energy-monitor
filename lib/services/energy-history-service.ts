import type { DashboardPeriod } from "@/lib/dashboard/types";
import { buildTodayEnergySnapshot } from "@/lib/energy/energy-engine";
import type { EnergyDevice } from "@/lib/energy/energy-engine.types";
import { normalizeMonetaryValue } from "@/lib/energy/energy-engine.utils";
import { resolveEffectiveEnergyTariff } from "@/lib/energy/energy-tariff";
import {
  buildCalendarPeriodRange,
  getExpectedPeriodDays,
  resolveApplicationDateKey,
  shiftCalendarDate,
} from "@/lib/history-calendar";
import type { EnergyHistoryPeriod } from "@/lib/history-types";
import type { EnergyHistoryRepository } from "@/lib/repositories/energy-history-repository";

type Clock = () => Date;

export class EnergyHistoryService {
  constructor(
    private readonly repository: EnergyHistoryRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async captureCurrentDay(
    userId: string,
    devices: readonly EnergyDevice[],
    tariffBrlPerKwh: number,
    instant = this.clock(),
  ) {
    const effectiveTariff =
      resolveEffectiveEnergyTariff(tariffBrlPerKwh);
    const snapshot = buildTodayEnergySnapshot(
      devices,
      effectiveTariff,
    );
    const distributionByDevice = new Map(
      snapshot.distribution.map((device) => [
        device.deviceId,
        device,
      ]),
    );

    return this.repository.upsertDailySnapshot(
      userId,
      resolveApplicationDateKey(instant),
      {
        totalConsumptionKwh: snapshot.totalConsumptionKwh,
        estimatedCost: snapshot.estimatedDailyCost,
        activeDeviceCount: snapshot.activeDeviceCount,
        tariffBrlPerKwh: effectiveTariff,
        devices: devices.map((device) => {
          const consumptionKwh =
            distributionByDevice.get(device.id)?.consumptionKwh ?? 0;

          return {
            deviceId: device.id,
            deviceNameSnapshot: device.name,
            estimatedConsumptionKwh: consumptionKwh,
            estimatedCost: normalizeMonetaryValue(
              consumptionKwh * effectiveTariff,
            ),
            active: device.status === "active",
          };
        }),
      },
    );
  }

  async getPeriod(
    userId: string,
    period: DashboardPeriod,
    instant = this.clock(),
  ): Promise<EnergyHistoryPeriod> {
    const referenceDate = resolveApplicationDateKey(instant);
    const expectedDays = getExpectedPeriodDays(period);
    const currentRange = buildCalendarPeriodRange(
      referenceDate,
      expectedDays,
    );
    const previousEndDate = shiftCalendarDate(
      currentRange.startDate,
      -1,
    );
    const previousRange = buildCalendarPeriodRange(
      previousEndDate,
      expectedDays,
    );
    const [snapshots, earliest] = await Promise.all([
      this.repository.findBetween(
        userId,
        previousRange.startDate,
        currentRange.endDate,
      ),
      this.repository.findEarliest(userId),
    ]);
    const current = snapshots.filter(
      (snapshot) =>
        snapshot.snapshotDate >= currentRange.startDate &&
        snapshot.snapshotDate <= currentRange.endDate,
    );
    const previous = snapshots.filter(
      (snapshot) =>
        snapshot.snapshotDate >= previousRange.startDate &&
        snapshot.snapshotDate <= previousRange.endDate,
    );
    const currentComplete = current.length === expectedDays;
    const previousComplete = previous.length === expectedDays;

    return {
      referenceDate,
      currentStartDate: currentRange.startDate,
      currentEndDate: currentRange.endDate,
      previousStartDate: previousRange.startDate,
      previousEndDate: previousRange.endDate,
      current,
      previous,
      coverage: {
        expectedDays,
        currentAvailableDays: current.length,
        previousAvailableDays: previous.length,
        currentComplete,
        previousComplete,
        comparisonAvailable: currentComplete && previousComplete,
        earliestSnapshotDate: earliest?.snapshotDate,
      },
    };
  }
}

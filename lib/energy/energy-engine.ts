import {
  DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
  ESTIMATED_MONTH_DAYS,
  EVENING_START_HOUR,
  MIN_RELEVANT_PEAK_CONTRIBUTION_PERCENTAGE,
  TODAY_INTERVAL_HOURS,
} from "@/lib/energy/energy-engine.constants";
import type {
  DeviceTimelineEntry,
  EnergyDevice,
  IntervalContributors,
  PeakContributor,
  TodayDeviceDistribution,
  TodayEnergySnapshot,
  TodayTimelinePoint,
} from "@/lib/energy/energy-engine.types";
import {
  calculateDeviceConsumptionKwh,
  normalizeAverageDailyHours,
  normalizeMonetaryValue,
  parseHour,
  toSafeNonNegative,
} from "@/lib/energy/energy-engine.utils";
import {
  buildUsageProfileWeights,
  resolveUsageProfile,
  resolveUsageProfileDetails,
} from "@/lib/energy/usage-profiles";

type RankedDevice = {
  device: EnergyDevice;
  powerWatts: number;
  averageDailyHours: number;
  consumptionKwh: number;
  usageProfile: ReturnType<typeof resolveUsageProfileDetails>;
};

function buildDistribution(
  activeDevices: readonly EnergyDevice[],
): {
  rankedDevices: readonly RankedDevice[];
  distribution: readonly TodayDeviceDistribution[];
  totalConsumptionKwh: number;
} {
  const rankedDevices = activeDevices
    .map((device) => ({
      device,
      powerWatts: toSafeNonNegative(device.powerWatts),
      averageDailyHours: normalizeAverageDailyHours(
        device.averageDailyHours,
      ),
      consumptionKwh: calculateDeviceConsumptionKwh(device),
      usageProfile: resolveUsageProfileDetails(device),
    }))
    .toSorted(
      (first, second) =>
        second.consumptionKwh - first.consumptionKwh ||
        first.device.name.localeCompare(second.device.name, "pt-BR") ||
        first.device.id.localeCompare(second.device.id),
    );
  const totalConsumptionKwh = rankedDevices.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const hasFiniteTotal = Number.isFinite(totalConsumptionKwh);
  const safeTotal = hasFiniteTotal ? totalConsumptionKwh : 0;
  const distribution = rankedDevices.map<TodayDeviceDistribution>(
    (item, index) => ({
      deviceId: item.device.id,
      name: item.device.name,
      category: item.device.category,
      powerWatts: item.powerWatts,
      averageDailyHours: item.averageDailyHours,
      consumptionKwh: hasFiniteTotal ? item.consumptionKwh : 0,
      percentage:
        safeTotal === 0 ? 0 : (item.consumptionKwh / safeTotal) * 100,
      ranking: index + 1,
      usageProfileType: item.usageProfile.type,
      usageProfileFallbackUsed:
        item.device.usageProfileFallbackUsed ??
        item.usageProfile.fallbackUsed,
    }),
  );

  return {
    rankedDevices,
    distribution,
    totalConsumptionKwh: safeTotal,
  };
}

export function buildDeviceTimeline(
  device: EnergyDevice,
): DeviceTimelineEntry {
  const totalConsumptionKwh =
    device.status === "active"
      ? calculateDeviceConsumptionKwh(device)
      : 0;
  const profile = resolveUsageProfile(device);
  const weights = buildUsageProfileWeights({
    category: device.category,
    usageProfileType: profile.type,
    usageWindows: profile.windows,
  });
  const weightTotal = weights.reduce(
    (total, weight) => total + weight,
    0,
  );
  const lastPositiveIndex = weights.findLastIndex(
    (weight) => weight > 0,
  );
  let allocatedConsumptionKwh = 0;

  const intervals = TODAY_INTERVAL_HOURS.map((hour, index) => {
    const consumptionKwh =
      totalConsumptionKwh === 0 || weightTotal === 0
        ? 0
        : index === lastPositiveIndex
          ? totalConsumptionKwh - allocatedConsumptionKwh
          : totalConsumptionKwh * (weights[index] / weightTotal);

    allocatedConsumptionKwh += consumptionKwh;

    return {
      hour,
      consumptionKwh,
    };
  });

  return {
    deviceId: device.id,
    name: device.name,
    category: device.category,
    totalConsumptionKwh,
    intervals,
  };
}

function buildAggregatedTimeline(
  deviceTimelines: readonly DeviceTimelineEntry[],
  totalConsumptionKwh: number,
): readonly TodayTimelinePoint[] {
  const timeline = TODAY_INTERVAL_HOURS.map((hour, index) => ({
    hour,
    consumptionKwh: deviceTimelines.reduce(
      (total, device) =>
        total + (device.intervals[index]?.consumptionKwh ?? 0),
      0,
    ),
  }));
  const timelineTotal = timeline.reduce(
    (total, point) => total + point.consumptionKwh,
    0,
  );
  const correctionIndex = timeline.findLastIndex(
    (point) => point.consumptionKwh > 0,
  );

  if (
    correctionIndex >= 0 &&
    timelineTotal !== totalConsumptionKwh
  ) {
    timeline[correctionIndex] = {
      ...timeline[correctionIndex],
      consumptionKwh:
        timeline[correctionIndex].consumptionKwh +
        (totalConsumptionKwh - timelineTotal),
    };
  }

  return timeline;
}

function buildContributorsByInterval(
  deviceTimelines: readonly DeviceTimelineEntry[],
  timeline: readonly TodayTimelinePoint[],
): readonly IntervalContributors[] {
  return timeline.map((point, intervalIndex) => {
    const contributors = deviceTimelines
      .map((device) => ({
        deviceId: device.deviceId,
        name: device.name,
        consumptionKwh:
          device.intervals[intervalIndex]?.consumptionKwh ?? 0,
      }))
      .filter((contributor) => contributor.consumptionKwh > 0)
      .toSorted(
        (first, second) =>
          second.consumptionKwh - first.consumptionKwh ||
          first.name.localeCompare(second.name, "pt-BR") ||
          first.deviceId.localeCompare(second.deviceId),
      )
      .map((contributor) => ({
        ...contributor,
        percentageOfInterval:
          point.consumptionKwh === 0
            ? 0
            : (contributor.consumptionKwh /
                point.consumptionKwh) *
              100,
      }));

    return {
      hour: point.hour,
      totalConsumptionKwh: point.consumptionKwh,
      contributors,
    };
  });
}

function buildTimelineMetrics(
  timeline: readonly TodayTimelinePoint[],
  totalConsumptionKwh: number,
) {
  if (totalConsumptionKwh === 0) {
    return {
      peakHour: null,
      peakConsumptionKwh: 0,
      minimumHour: null,
      minimumConsumptionKwh: 0,
      averageConsumptionKwh: 0,
      eveningConsumptionKwh: 0,
      eveningPercentage: 0,
    };
  }

  const peak = timeline.reduce((current, point) =>
    point.consumptionKwh > current.consumptionKwh ? point : current,
  );
  const minimum = timeline.reduce((current, point) =>
    point.consumptionKwh < current.consumptionKwh ? point : current,
  );
  const eveningConsumptionKwh = timeline
    .filter((point) => parseHour(point.hour) >= EVENING_START_HOUR)
    .reduce((total, point) => total + point.consumptionKwh, 0);

  return {
    peakHour: peak.hour,
    peakConsumptionKwh: peak.consumptionKwh,
    minimumHour: minimum.hour,
    minimumConsumptionKwh: minimum.consumptionKwh,
    averageConsumptionKwh:
      totalConsumptionKwh / timeline.length,
    eveningConsumptionKwh,
    eveningPercentage:
      (eveningConsumptionKwh / totalConsumptionKwh) * 100,
  };
}

function buildPeakContributors(
  peakHour: string | null,
  contributorsByInterval: readonly IntervalContributors[],
): readonly PeakContributor[] {
  if (!peakHour) {
    return [];
  }

  const peak = contributorsByInterval.find(
    (interval) => interval.hour === peakHour,
  );

  if (!peak) {
    return [];
  }

  return peak.contributors
    .filter(
      (contributor) =>
        contributor.percentageOfInterval >=
        MIN_RELEVANT_PEAK_CONTRIBUTION_PERCENTAGE,
    )
    .slice(0, 2)
    .map((contributor) => ({
      deviceId: contributor.deviceId,
      name: contributor.name,
      consumptionKwh: contributor.consumptionKwh,
      percentageOfPeak: contributor.percentageOfInterval,
    }));
}

export function buildTodayEnergySnapshot(
  devices: readonly EnergyDevice[],
  tariffBrlPerKwh = DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
): TodayEnergySnapshot {
  const activeDevices = devices.filter(
    (device) => device.status === "active",
  );
  const {
    rankedDevices,
    distribution,
    totalConsumptionKwh,
  } = buildDistribution(activeDevices);
  const deviceTimelines = rankedDevices.map(({ device }) =>
    buildDeviceTimeline(device),
  );
  const timeline = buildAggregatedTimeline(
    deviceTimelines,
    totalConsumptionKwh,
  );
  const contributorsByInterval = buildContributorsByInterval(
    deviceTimelines,
    timeline,
  );
  const metrics = buildTimelineMetrics(
    timeline,
    totalConsumptionKwh,
  );
  const estimatedDailyCost = normalizeMonetaryValue(
    totalConsumptionKwh * tariffBrlPerKwh,
  );
  const estimatedMonthlyConsumptionKwh =
    totalConsumptionKwh * ESTIMATED_MONTH_DAYS;
  const estimatedMonthlyCost = normalizeMonetaryValue(
    estimatedMonthlyConsumptionKwh * tariffBrlPerKwh,
  );

  return {
    activeDeviceCount: activeDevices.length,
    totalConsumptionKwh,
    estimatedDailyCost,
    estimatedMonthlyConsumptionKwh,
    estimatedMonthlyCost,
    distribution,
    deviceTimelines,
    timeline,
    contributorsByInterval,
    peakContributors: buildPeakContributors(
      metrics.peakHour,
      contributorsByInterval,
    ),
    metrics,
  };
}

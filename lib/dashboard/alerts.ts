import type { DashboardPeriod } from "@/lib/dashboard/types";
import type {
  AlertSeverity,
  DashboardAlert,
} from "@/lib/dashboard/alert-types";
import type {
  AnalyzedDeviceConsumption,
  DeviceConsumptionAnalysis,
  EnergyUsageAnalysis,
} from "@/lib/dashboard/analytics";
import {
  formatChartEnergy,
  formatDetailedPercentage,
  formatSignedChartEnergy,
} from "@/lib/dashboard/formatters";

const PEAK_THRESHOLD = 0.3;
const HIGH_PEAK_THRESHOLD = 0.5;
const DEVICE_CONCENTRATION_THRESHOLD = 0.35;
const HIGH_DEVICE_CONCENTRATION_THRESHOLD = 0.45;
const STABLE_COMPARISON_THRESHOLD = 0.02;
const RELEVANT_COMPARISON_THRESHOLD = 0.1;
const HIGH_DEVICE_TREND_THRESHOLD = 0.2;
const TOP_THREE_THRESHOLD = 0.7;
const MEDIUM_TOP_THREE_THRESHOLD = 0.85;

const severityPriority: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

type GenerateDashboardAlertsInput = {
  period: DashboardPeriod;
  currentLabel: string;
  temporalAnalysis: EnergyUsageAnalysis;
  deviceAnalysis: DeviceConsumptionAnalysis;
};

function lowercaseFirst(value: string) {
  return value.charAt(0).toLocaleLowerCase("pt-BR") + value.slice(1);
}

function describeDirection(
  direction: "increase" | "decrease" | "stable",
) {
  if (direction === "increase") {
    return "aumentou";
  }

  if (direction === "decrease") {
    return "reduziu";
  }

  return "permaneceu estável";
}

function joinDeviceNames(
  items: readonly AnalyzedDeviceConsumption[],
) {
  const names = items.map((item) => item.device);

  if (names.length < 2) {
    return names[0] ?? "";
  }

  return `${names.slice(0, -1).join(", ")} e ${lowercaseFirst(names.at(-1) ?? "")}`;
}

function createPeakAlert({
  period,
  currentLabel,
  temporalAnalysis,
}: GenerateDashboardAlertsInput): DashboardAlert | null {
  const { peak, averageKwh } = temporalAnalysis;

  if (!peak || averageKwh <= 0) {
    return null;
  }

  const differenceFromAverage = peak.currentKwh / averageKwh - 1;

  if (differenceFromAverage <= PEAK_THRESHOLD) {
    return null;
  }

  const occurrence =
    period === "today"
      ? `às ${peak.currentLabel}`
      : `em ${peak.currentLabel}`;

  return {
    id: `${period}-peak-${peak.id}`,
    severity:
      differenceFromAverage >= HIGH_PEAK_THRESHOLD ? "high" : "medium",
    category: "peak",
    title: `Pico de ${formatChartEnergy(peak.currentKwh)} ${occurrence}`,
    description: `O valor ficou ${formatDetailedPercentage(differenceFromAverage, 1)} acima da média de ${formatChartEnergy(averageKwh)} por leitura em ${currentLabel.toLocaleLowerCase("pt-BR")}.`,
    createdAt: peak.currentLabel,
    source: "system",
  };
}

function createDeviceConcentrationAlert({
  period,
  currentLabel,
  deviceAnalysis,
}: GenerateDashboardAlertsInput): DashboardAlert | null {
  const leader = [...deviceAnalysis.items].sort(
    (first, second) => first.rank - second.rank,
  )[0];

  if (!leader || leader.percentage <= DEVICE_CONCENTRATION_THRESHOLD) {
    return null;
  }

  return {
    id: `${period}-device-concentration-${leader.id}`,
    severity:
      leader.percentage >= HIGH_DEVICE_CONCENTRATION_THRESHOLD
        ? "high"
        : "medium",
    category: "device",
    title: `${leader.device} concentrou ${formatDetailedPercentage(leader.consumptionKwh, deviceAnalysis.totalKwh)} do consumo`,
    description: `${formatChartEnergy(leader.consumptionKwh)} de um total de ${formatChartEnergy(deviceAnalysis.totalKwh)} vieram desse dispositivo.`,
    createdAt: currentLabel,
    source: "device",
  };
}

function createComparisonAlert({
  period,
  currentLabel,
  temporalAnalysis,
}: GenerateDashboardAlertsInput): DashboardAlert | null {
  const comparison = temporalAnalysis.overallComparison;

  if (!comparison || comparison.percentageChange === null) {
    return null;
  }

  const magnitude = Math.abs(comparison.percentageChange);
  const severity: AlertSeverity =
    magnitude < STABLE_COMPARISON_THRESHOLD
      ? "info"
      : magnitude >= RELEVANT_COMPARISON_THRESHOLD
        ? "high"
        : "low";
  const directionText =
    comparison.direction === "stable"
      ? "variou apenas"
      : describeDirection(comparison.direction);

  return {
    id: `${period}-overall-comparison`,
    severity,
    category: "comparison",
    title: `O consumo ${directionText} ${formatDetailedPercentage(magnitude, 1)}`,
    description: `${formatChartEnergy(temporalAnalysis.totalKwh)} em ${currentLabel.toLocaleLowerCase("pt-BR")}, ante ${formatChartEnergy(comparison.previousValue)} em ${comparison.previousLabel}.`,
    createdAt: currentLabel,
    source: "comparison",
  };
}

function createTopThreeAlert({
  period,
  currentLabel,
  deviceAnalysis,
}: GenerateDashboardAlertsInput): DashboardAlert | null {
  const topThree = [...deviceAnalysis.items]
    .sort((first, second) => first.rank - second.rank)
    .slice(0, 3);
  const topThreeTotal = topThree.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const concentration =
    deviceAnalysis.totalKwh === 0
      ? 0
      : topThreeTotal / deviceAnalysis.totalKwh;

  if (topThree.length < 3 || concentration <= TOP_THREE_THRESHOLD) {
    return null;
  }

  return {
    id: `${period}-top-three-distribution`,
    severity:
      concentration >= MEDIUM_TOP_THREE_THRESHOLD ? "medium" : "low",
    category: "distribution",
    title: `Os três maiores consumidores concentraram ${formatDetailedPercentage(topThreeTotal, deviceAnalysis.totalKwh)}`,
    description: `${joinDeviceNames(topThree)} somaram ${formatChartEnergy(topThreeTotal)} em ${currentLabel.toLocaleLowerCase("pt-BR")}.`,
    createdAt: currentLabel,
    source: "device",
  };
}

function createDeviceTrendAlert({
  period,
  currentLabel,
  deviceAnalysis,
}: GenerateDashboardAlertsInput): DashboardAlert | null {
  const largestChange = [...deviceAnalysis.items]
    .filter(
      (item) =>
        item.periodComparison?.percentageChange !== undefined &&
        item.periodComparison.percentageChange !== null,
    )
    .sort(
      (first, second) =>
        Math.abs(second.periodComparison?.absoluteChange ?? 0) -
        Math.abs(first.periodComparison?.absoluteChange ?? 0),
    )[0];
  const comparison = largestChange?.periodComparison;

  if (
    !largestChange ||
    !comparison ||
    comparison.percentageChange === null ||
    Math.abs(comparison.percentageChange) <
      RELEVANT_COMPARISON_THRESHOLD
  ) {
    return null;
  }

  const magnitude = Math.abs(comparison.percentageChange);

  return {
    id: `${period}-device-trend-${largestChange.id}`,
    severity:
      magnitude >= HIGH_DEVICE_TREND_THRESHOLD ? "high" : "medium",
    category: "trend",
    title: `${largestChange.device} ${describeDirection(comparison.direction)} ${formatDetailedPercentage(magnitude, 1)}`,
    description: `A diferença foi de ${formatSignedChartEnergy(comparison.absoluteChange)} em relação a ${comparison.previousLabel}.`,
    createdAt: currentLabel,
    source: "device",
  };
}

export function generateDashboardAlerts(
  input: GenerateDashboardAlertsInput,
): readonly DashboardAlert[] {
  const alerts = [
    createPeakAlert(input),
    createDeviceConcentrationAlert(input),
    createComparisonAlert(input),
    createTopThreeAlert(input),
    createDeviceTrendAlert(input),
  ].filter((alert): alert is DashboardAlert => alert !== null);

  return alerts.sort(
    (first, second) =>
      severityPriority[first.severity] - severityPriority[second.severity],
  );
}

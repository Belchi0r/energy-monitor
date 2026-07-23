import type {
  AlignedTemporalPoint,
  DashboardDataset,
  DashboardPeriodDefinition,
  DeviceConsumption,
  NumericComparison,
} from "@/lib/dashboard/types";
import {
  alignTemporalSeries,
  compareNumbers,
  findPreviousDevice,
  sumEnergy,
} from "@/lib/dashboard/comparison";
import {
  formatChartEnergy,
  formatDetailedPercentage,
  formatEnergy,
  formatPercentage,
  formatRatioPercentage,
  formatSignedChartEnergy,
} from "@/lib/dashboard/formatters";

export type InsightTone = "brand" | "neutral" | "attention";

export type ChartInsight = {
  id: string;
  title: string;
  description: string;
  tone: InsightTone;
};

export type AnalyzedTemporalPoint = AlignedTemporalPoint & {
  periodPercentage: number;
  deltaFromPreviousPointKwh: number | null;
  comparison?: NumericComparison;
  isPeak: boolean;
  isMinimum: boolean;
};

export type EnergyUsageAnalysis = {
  points: readonly AnalyzedTemporalPoint[];
  totalKwh: number;
  previousTotalKwh?: number;
  averageKwh: number;
  peak: AnalyzedTemporalPoint | null;
  minimum: AnalyzedTemporalPoint | null;
  overallComparison?: NumericComparison;
  insights: readonly ChartInsight[];
};

export type AnalyzedDeviceConsumption = DeviceConsumption & {
  index: number;
  percentage: number;
  rank: number;
  comparison: string;
  periodComparison?: NumericComparison;
};

export type DeviceConsumptionAnalysis = {
  items: readonly AnalyzedDeviceConsumption[];
  totalKwh: number;
  previousTotalKwh?: number;
  overallComparison?: NumericComparison;
  insights: readonly ChartInsight[];
};

function lowercaseFirst(value: string) {
  return value.charAt(0).toLocaleLowerCase("pt-BR") + value.slice(1);
}

function comparisonTone(comparison: NumericComparison): InsightTone {
  if (comparison.significance === "relevant") {
    return "attention";
  }

  return comparison.significance === "moderate" ? "brand" : "neutral";
}

function findExtremumIndex(
  points: readonly AlignedTemporalPoint[],
  mode: "maximum" | "minimum",
) {
  return points.reduce((currentIndex, point, index) => {
    const current = points[currentIndex].currentKwh;
    const candidate = point.currentKwh;
    const shouldReplace =
      mode === "maximum" ? candidate > current : candidate < current;

    return shouldReplace ? index : currentIndex;
  }, 0);
}

export function analyzeEnergyUsage(
  currentDataset: DashboardDataset,
  period: DashboardPeriodDefinition,
  previousDataset?: DashboardDataset,
): EnergyUsageAnalysis {
  const alignedPoints = alignTemporalSeries(
    currentDataset.energyUsage,
    previousDataset?.energyUsage,
  );

  if (alignedPoints.length === 0) {
    return {
      points: [],
      totalKwh: 0,
      averageKwh: 0,
      peak: null,
      minimum: null,
      insights: [],
    };
  }

  const totalKwh = sumEnergy(currentDataset.energyUsage);
  const previousTotalKwh = previousDataset
    ? sumEnergy(previousDataset.energyUsage)
    : undefined;
  const averageKwh = totalKwh / alignedPoints.length;
  const peakIndex = findExtremumIndex(alignedPoints, "maximum");
  const minimumIndex = findExtremumIndex(alignedPoints, "minimum");

  const points = alignedPoints.map<AnalyzedTemporalPoint>((point, index) => {
    const previousPoint = alignedPoints[index - 1];

    return {
      ...point,
      periodPercentage: totalKwh === 0 ? 0 : point.currentKwh / totalKwh,
      deltaFromPreviousPointKwh:
        index === 0 ? null : point.currentKwh - previousPoint.currentKwh,
      comparison:
        point.previousKwh === undefined
          ? undefined
          : compareNumbers(
              point.currentKwh,
              point.previousKwh,
              period.comparisonLabel,
            ),
      isPeak: index === peakIndex,
      isMinimum: index === minimumIndex,
    };
  });

  const peak = points[peakIndex];
  const minimum = points[minimumIndex];
  const overallComparison =
    previousTotalKwh === undefined
      ? undefined
      : compareNumbers(totalKwh, previousTotalKwh, period.comparisonLabel);
  const insights: ChartInsight[] = [];

  if (overallComparison) {
    insights.push({
      id: "period-comparison",
      title: overallComparison.message,
      description: `${formatChartEnergy(totalKwh)} no período atual, ante ${formatChartEnergy(previousTotalKwh ?? 0)} em ${period.comparisonLabel}.`,
      tone: comparisonTone(overallComparison),
    });
  }

  insights.push({
    id: "period-peak",
    title:
      currentDataset.granularity === "twoHours"
        ? `Maior consumo ocorreu às ${peak.currentLabel}.`
        : `Maior consumo ocorreu em ${peak.currentLabel}.`,
    description: `O pico foi ${formatChartEnergy(peak.currentKwh)} e representou ${formatDetailedPercentage(peak.currentKwh, totalKwh)} do consumo do período.`,
    tone: "brand",
  });

  if (currentDataset.granularity === "twoHours") {
    const eveningPoints = points.filter(
      (point) => Number.parseInt(point.axisLabel, 10) >= 18,
    );
    const eveningTotal = eveningPoints.reduce(
      (total, point) => total + point.currentKwh,
      0,
    );

    insights.push({
      id: "evening-concentration",
      title: `${formatPercentage(eveningTotal, totalKwh)} do consumo ocorreu após as 18h.`,
      description: `Esse trecho concentrou ${formatChartEnergy(eveningTotal)} do cenário diário demonstrativo.`,
      tone: "attention",
    });
  } else {
    const weekendTotal = points
      .filter((point) => point.isWeekend)
      .reduce((total, point) => total + point.currentKwh, 0);

    insights.push({
      id: "weekend-concentration",
      title: `${formatPercentage(weekendTotal, totalKwh)} do consumo ocorreu em fins de semana.`,
      description: `Os dias marcados como sábado ou domingo somaram ${formatChartEnergy(weekendTotal)}.`,
      tone: "neutral",
    });
  }

  return {
    points,
    totalKwh,
    previousTotalKwh,
    averageKwh,
    peak,
    minimum,
    overallComparison,
    insights,
  };
}

export function analyzeDeviceConsumption(
  current: readonly DeviceConsumption[],
  previous: readonly DeviceConsumption[] | undefined,
  previousLabel: string,
): DeviceConsumptionAnalysis {
  if (current.length === 0) {
    return { items: [], totalKwh: 0, insights: [] };
  }

  const totalKwh = current.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const previousTotalKwh = previous?.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const averageKwh = totalKwh / current.length;
  const rankedItems = [...current].sort(
    (first, second) => second.consumptionKwh - first.consumptionKwh,
  );
  const rankById = new Map(
    rankedItems.map((item, index) => [item.id, index + 1]),
  );

  const items = current.map<AnalyzedDeviceConsumption>((item, index) => {
    const differenceFromAverage =
      averageKwh === 0
        ? 0
        : (item.consumptionKwh - averageKwh) / averageKwh;
    const previousItem = findPreviousDevice(item, previous);

    return {
      ...item,
      index,
      percentage: totalKwh === 0 ? 0 : item.consumptionKwh / totalKwh,
      rank: rankById.get(item.id) ?? current.length,
      comparison: `${formatRatioPercentage(Math.abs(differenceFromAverage))} ${differenceFromAverage >= 0 ? "acima" : "abaixo"} da média por dispositivo.`,
      periodComparison: previousItem
        ? compareNumbers(
            item.consumptionKwh,
            previousItem.consumptionKwh,
            previousLabel,
          )
        : undefined,
    };
  });

  const topItem = rankedItems[0];
  const topTwo = rankedItems.slice(0, 2);
  const topTwoTotal = topTwo.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const overallComparison =
    previousTotalKwh === undefined
      ? undefined
      : compareNumbers(totalKwh, previousTotalKwh, previousLabel);
  const largestDeviceChange = [...items]
    .filter((item) => item.periodComparison)
    .sort(
      (first, second) =>
        Math.abs(second.periodComparison?.absoluteChange ?? 0) -
        Math.abs(first.periodComparison?.absoluteChange ?? 0),
    )[0];
  const insights: ChartInsight[] = [
    {
      id: "device-leader",
      title: `${formatPercentage(topItem.consumptionKwh, totalKwh)} do consumo veio do ${lowercaseFirst(topItem.device)}.`,
      description: `${formatEnergy(topItem.consumptionKwh)} colocaram o dispositivo na liderança do período.`,
      tone: "brand",
    },
    {
      id: "top-two-concentration",
      title: `Dois dispositivos concentraram ${formatPercentage(topTwoTotal, totalKwh)} do consumo.`,
      description: `${topTwo[0].device} e ${lowercaseFirst(topTwo[1].device)} somaram ${formatChartEnergy(topTwoTotal)}.`,
      tone: "neutral",
    },
  ];

  if (largestDeviceChange?.periodComparison) {
    insights.push({
      id: "largest-device-change",
      title: `${largestDeviceChange.device}: ${largestDeviceChange.periodComparison.message}`,
      description: `Variação absoluta de ${formatSignedChartEnergy(largestDeviceChange.periodComparison.absoluteChange)} no comparativo.`,
      tone: comparisonTone(largestDeviceChange.periodComparison),
    });
  }

  return {
    items,
    totalKwh,
    previousTotalKwh,
    overallComparison,
    insights,
  };
}

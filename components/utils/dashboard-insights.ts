import type {
  DeviceConsumption,
  EnergyUsagePoint,
} from "@/components/types/dashboard";
import {
  formatChartEnergy,
  formatDetailedPercentage,
  formatEnergy,
  formatPercentage,
  formatRatioPercentage,
} from "@/components/utils/formatters";

export type InsightTone = "brand" | "neutral" | "attention";

export type ChartInsight = {
  id: string;
  title: string;
  description: string;
  tone: InsightTone;
};

export type AnalyzedEnergyPoint = EnergyUsagePoint & {
  index: number;
  dailyPercentage: number;
  deltaFromPreviousKwh: number | null;
  isPeak: boolean;
  isMinimum: boolean;
};

export type EnergyUsageAnalysis = {
  points: readonly AnalyzedEnergyPoint[];
  totalKwh: number;
  averageKwh: number;
  peak: AnalyzedEnergyPoint | null;
  minimum: AnalyzedEnergyPoint | null;
  insights: readonly ChartInsight[];
};

export type AnalyzedDeviceConsumption = DeviceConsumption & {
  index: number;
  percentage: number;
  rank: number;
  comparison: string;
};

export type DeviceConsumptionAnalysis = {
  items: readonly AnalyzedDeviceConsumption[];
  totalKwh: number;
  insights: readonly ChartInsight[];
};

function getHour(time: string) {
  const hour = Number.parseInt(time, 10);
  return Number.isNaN(hour) ? 0 : hour;
}

function lowercaseFirst(value: string) {
  return value.charAt(0).toLocaleLowerCase("pt-BR") + value.slice(1);
}

export function analyzeEnergyUsage(
  data: readonly EnergyUsagePoint[],
): EnergyUsageAnalysis {
  if (data.length === 0) {
    return {
      points: [],
      totalKwh: 0,
      averageKwh: 0,
      peak: null,
      minimum: null,
      insights: [],
    };
  }

  const totalKwh = data.reduce(
    (total, point) => total + point.consumptionKwh,
    0,
  );
  const averageKwh = totalKwh / data.length;
  const peakIndex = data.reduce(
    (currentIndex, point, index) =>
      point.consumptionKwh > data[currentIndex].consumptionKwh
        ? index
        : currentIndex,
    0,
  );
  const minimumIndex = data.reduce(
    (currentIndex, point, index) =>
      point.consumptionKwh < data[currentIndex].consumptionKwh
        ? index
        : currentIndex,
    0,
  );

  const points = data.map<AnalyzedEnergyPoint>((point, index) => ({
    ...point,
    index,
    dailyPercentage: totalKwh === 0 ? 0 : point.consumptionKwh / totalKwh,
    deltaFromPreviousKwh:
      index === 0
        ? null
        : point.consumptionKwh - data[index - 1].consumptionKwh,
    isPeak: index === peakIndex,
    isMinimum: index === minimumIndex,
  }));

  const peak = points[peakIndex];
  const minimum = points[minimumIndex];
  const insights: ChartInsight[] = [
    {
      id: "daily-peak",
      title: `Maior consumo ocorreu às ${peak.time}.`,
      description: `O pico foi ${formatChartEnergy(peak.consumptionKwh)} e representou ${formatDetailedPercentage(peak.consumptionKwh, totalKwh)} do consumo diário.`,
      tone: "brand",
    },
  ];

  const eveningPoints = points.filter((point) => getHour(point.time) >= 18);
  const eveningTotal = eveningPoints.reduce(
    (total, point) => total + point.consumptionKwh,
    0,
  );

  if (eveningPoints.length > 0) {
    insights.push({
      id: "evening-concentration",
      title: `${formatPercentage(eveningTotal, totalKwh)} do consumo ficou entre ${eveningPoints[0].time} e ${eveningPoints.at(-1)?.time}.`,
      description: `Esse período concentrou ${formatChartEnergy(eveningTotal)} do cenário diário.`,
      tone: "attention",
    });
  }

  const biggestIncrease = points.slice(1).reduce<AnalyzedEnergyPoint | null>(
    (current, point) => {
      if (point.deltaFromPreviousKwh === null) {
        return current;
      }

      if (
        current === null ||
        current.deltaFromPreviousKwh === null ||
        point.deltaFromPreviousKwh > current.deltaFromPreviousKwh
      ) {
        return point;
      }

      return current;
    },
    null,
  );

  if (
    biggestIncrease?.deltaFromPreviousKwh !== null &&
    biggestIncrease?.deltaFromPreviousKwh !== undefined &&
    biggestIncrease.deltaFromPreviousKwh > 0
  ) {
    const previousPoint = points[biggestIncrease.index - 1];
    const increaseRatio =
      previousPoint.consumptionKwh === 0
        ? 0
        : biggestIncrease.deltaFromPreviousKwh /
          previousPoint.consumptionKwh;

    insights.push({
      id: "largest-increase",
      title: `Consumo acelerou entre ${previousPoint.time} e ${biggestIncrease.time}.`,
      description: `A alta foi de ${formatRatioPercentage(increaseRatio)}, passando de ${formatChartEnergy(previousPoint.consumptionKwh)} para ${formatChartEnergy(biggestIncrease.consumptionKwh)}.`,
      tone: "neutral",
    });
  }

  return {
    points,
    totalKwh,
    averageKwh,
    peak,
    minimum,
    insights,
  };
}

export function analyzeDeviceConsumption(
  data: readonly DeviceConsumption[],
): DeviceConsumptionAnalysis {
  if (data.length === 0) {
    return { items: [], totalKwh: 0, insights: [] };
  }

  const totalKwh = data.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const averageKwh = totalKwh / data.length;
  const rankedItems = [...data].sort(
    (first, second) => second.consumptionKwh - first.consumptionKwh,
  );
  const rankById = new Map(
    rankedItems.map((item, index) => [item.id, index + 1]),
  );

  const items = data.map<AnalyzedDeviceConsumption>((item, index) => {
    const differenceFromAverage =
      averageKwh === 0
        ? 0
        : (item.consumptionKwh - averageKwh) / averageKwh;
    const direction = differenceFromAverage >= 0 ? "acima" : "abaixo";

    return {
      ...item,
      index,
      percentage: totalKwh === 0 ? 0 : item.consumptionKwh / totalKwh,
      rank: rankById.get(item.id) ?? data.length,
      comparison: `${formatRatioPercentage(Math.abs(differenceFromAverage))} ${direction} da média por dispositivo.`,
    };
  });

  const topItem = rankedItems[0];
  const topTwo = rankedItems.slice(0, 2);
  const topThree = rankedItems.slice(0, 3);
  const topTwoTotal = topTwo.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );
  const topThreeTotal = topThree.reduce(
    (total, item) => total + item.consumptionKwh,
    0,
  );

  const insights: ChartInsight[] = [
    {
      id: "device-leader",
      title: `${formatPercentage(topItem.consumptionKwh, totalKwh)} do consumo veio do ${lowercaseFirst(topItem.device)}.`,
      description: `${formatEnergy(topItem.consumptionKwh)} colocaram o dispositivo na liderança do cenário.`,
      tone: "brand",
    },
  ];

  if (topTwo.length === 2) {
    insights.push({
      id: "top-two-concentration",
      title: `Dois dispositivos concentraram ${formatPercentage(topTwoTotal, totalKwh)} do consumo.`,
      description: `${topTwo[0].device} e ${lowercaseFirst(topTwo[1].device)} somaram ${formatChartEnergy(topTwoTotal)}.`,
      tone: "attention",
    });
  }

  if (topThree.length === 3) {
    insights.push({
      id: "top-three-concentration",
      title: `Os três maiores responderam por ${formatPercentage(topThreeTotal, totalKwh)} do total.`,
      description: `Os demais grupos dividiram os ${formatPercentage(totalKwh - topThreeTotal, totalKwh)} restantes.`,
      tone: "neutral",
    });
  }

  return { items, totalKwh, insights };
}

import type {
  AnalyzedDeviceConsumption,
  AnalyzedTemporalPoint,
  ChartInsight,
  DeviceConsumptionAnalysis,
  EnergyUsageAnalysis,
  InsightTone,
} from "@/lib/dashboard/analytics";
import {
  compareNumbers,
  sumEnergy,
} from "@/lib/dashboard/comparison";
import {
  formatChartEnergy,
  formatDetailedPercentage,
  formatEnergy,
  formatRatioPercentage,
} from "@/lib/dashboard/formatters";
import type {
  DashboardDataset,
  DashboardPeriodDefinition,
} from "@/lib/dashboard/types";
import type { TodayEnergySnapshot } from "@/lib/energy/energy-engine.types";
import { formatDeviceDisplayName } from "@/lib/energy/advisor/energy-advisor.utils";

function lowercaseFirst(value: string) {
  return value.charAt(0).toLocaleLowerCase("pt-BR") + value.slice(1);
}

function comparisonTone(
  significance: "stable" | "moderate" | "relevant",
): InsightTone {
  if (significance === "relevant") {
    return "attention";
  }

  return significance === "moderate" ? "brand" : "neutral";
}

export function buildTodayTemporalAnalysis(
  snapshot: TodayEnergySnapshot,
  definition: DashboardPeriodDefinition,
  previousDataset?: DashboardDataset,
): EnergyUsageAnalysis {
  const previousTotalKwh = previousDataset
    ? sumEnergy(previousDataset.energyUsage)
    : undefined;
  const points = snapshot.timeline.map<AnalyzedTemporalPoint>(
    (point, index) => {
      const previousPoint = previousDataset?.energyUsage[index];
      const previousCurrentPoint = snapshot.timeline[index - 1];

      return {
        id: point.hour,
        index,
        axisLabel: point.hour,
        currentLabel: point.hour,
        previousLabel: previousPoint?.label,
        currentKwh: point.consumptionKwh,
        previousKwh: previousPoint?.consumptionKwh,
        periodPercentage:
          snapshot.totalConsumptionKwh === 0
            ? 0
            : point.consumptionKwh /
              snapshot.totalConsumptionKwh,
        deltaFromPreviousPointKwh:
          index === 0
            ? null
            : point.consumptionKwh -
              (previousCurrentPoint?.consumptionKwh ?? 0),
        comparison:
          previousPoint === undefined
            ? undefined
            : compareNumbers(
                point.consumptionKwh,
                previousPoint.consumptionKwh,
                definition.comparisonLabel,
              ),
        isPeak: snapshot.metrics.peakHour === point.hour,
        isMinimum: snapshot.metrics.minimumHour === point.hour,
      };
    },
  );
  const peak =
    points.find((point) => point.isPeak) ?? null;
  const minimum =
    points.find((point) => point.isMinimum) ?? null;
  const overallComparison =
    previousTotalKwh === undefined
      ? undefined
      : compareNumbers(
          snapshot.totalConsumptionKwh,
          previousTotalKwh,
          definition.comparisonLabel,
        );
  const insights: ChartInsight[] = [];

  if (overallComparison && previousTotalKwh !== undefined) {
    insights.push({
      id: "period-comparison",
      title: overallComparison.message,
      description: `${formatChartEnergy(snapshot.totalConsumptionKwh)} estimados hoje, ante ${formatChartEnergy(previousTotalKwh)} no cenário de ${definition.comparisonLabel}.`,
      tone: comparisonTone(overallComparison.significance),
    });
  }

  if (peak) {
    const contributorNames = snapshot.peakContributors.map(
      (contributor) =>
        formatDeviceDisplayName(contributor.name),
    );
    const contributorSummary =
      contributorNames.length === 2
        ? `${contributorNames[0]} e ${contributorNames[1]}`
        : contributorNames[0];
    const contributorDetails = snapshot.peakContributors
      .map(
        (contributor) =>
          `${formatDeviceDisplayName(contributor.name)}: ${formatDetailedPercentage(contributor.consumptionKwh, snapshot.metrics.peakConsumptionKwh)}`,
      )
      .join("; ");

    insights.push({
      id: "period-peak",
      title: contributorSummary
        ? `O pico ocorreu às ${snapshot.metrics.peakHour}, com maior contribuição de ${contributorSummary}.`
        : `O pico ocorreu às ${snapshot.metrics.peakHour}.`,
      description: `O intervalo somou ${formatChartEnergy(snapshot.metrics.peakConsumptionKwh)} e representou ${formatDetailedPercentage(snapshot.metrics.peakConsumptionKwh, snapshot.totalConsumptionKwh)} do dia.${contributorDetails ? ` Participação no pico — ${contributorDetails}.` : ""}`,
      tone: "brand",
    });
  }

  if (snapshot.totalConsumptionKwh > 0) {
    insights.push({
      id: "evening-concentration",
      title: `${formatRatioPercentage(snapshot.metrics.eveningPercentage / 100)} do consumo estimado ocorre após as 18h.`,
      description: `Os perfis de uso dos dispositivos alocam ${formatChartEnergy(snapshot.metrics.eveningConsumptionKwh)} nesse trecho do dia.`,
      tone: "attention",
    });
  }

  return {
    points,
    totalKwh: snapshot.totalConsumptionKwh,
    previousTotalKwh,
    averageKwh: snapshot.metrics.averageConsumptionKwh,
    peak,
    minimum,
    overallComparison,
    insights,
  };
}

export function buildTodayDeviceAnalysis(
  snapshot: TodayEnergySnapshot,
): DeviceConsumptionAnalysis {
  if (snapshot.distribution.length === 0) {
    return {
      items: [],
      totalKwh: 0,
      insights: [],
    };
  }

  const averageKwh =
    snapshot.totalConsumptionKwh / snapshot.distribution.length;
  const positiveDevices = snapshot.distribution.filter(
    (item) => item.consumptionKwh > 0,
  );
  const items = snapshot.distribution.map<AnalyzedDeviceConsumption>(
    (item, index) => {
      const differenceFromAverage =
        averageKwh === 0
          ? 0
          : (item.consumptionKwh - averageKwh) / averageKwh;
      const comparison =
        item.consumptionKwh === 0
          ? "Sem consumo com a configuração atual."
          : positiveDevices.length === 1
            ? "Único dispositivo com consumo estimado."
            : `${formatRatioPercentage(Math.abs(differenceFromAverage))} ${differenceFromAverage >= 0 ? "acima" : "abaixo"} da média por dispositivo.`;

      return {
        id: item.deviceId,
        device: formatDeviceDisplayName(item.name),
        description: `Estimativa atual para ${item.category.toLocaleLowerCase("pt-BR")}.`,
        consumptionKwh: item.consumptionKwh,
        index,
        percentage: item.percentage / 100,
        rank: item.ranking,
        comparison,
      };
    },
  );
  const leader = items.find((item) => item.consumptionKwh > 0);
  const topTwo = positiveDevices.slice(0, 2);
  const topTwoPercentage = topTwo.reduce(
    (total, item) => total + item.percentage,
    0,
  );
  const insights: ChartInsight[] = [];

  if (leader) {
    insights.push({
      id: "device-leader",
      title: `${formatRatioPercentage(leader.percentage)} do consumo estimado vem do ${lowercaseFirst(leader.device)}.`,
      description: `${formatEnergy(leader.consumptionKwh)} colocam o dispositivo na liderança da estimativa atual.`,
      tone: "brand",
    });
  }

  if (
    positiveDevices.length >= 3 &&
    topTwo.length === 2 &&
    topTwoPercentage < 95
  ) {
    insights.push({
      id: "top-two-concentration",
      title: `Os dois maiores dispositivos concentram ${formatRatioPercentage(topTwoPercentage / 100)} do consumo estimado.`,
      description: `${formatDeviceDisplayName(topTwo[0].name)} e ${lowercaseFirst(formatDeviceDisplayName(topTwo[1].name))} somam ${formatChartEnergy(topTwo[0].consumptionKwh + topTwo[1].consumptionKwh)}.`,
      tone: "neutral",
    });
  }

  return {
    items,
    totalKwh: snapshot.totalConsumptionKwh,
    insights,
  };
}

import {
  PERIOD_EFFICIENCY_LIMITS,
  PERIOD_SCORE_IMPACTS,
} from "@/lib/dashboard/period-efficiency.constants";
import {
  compareNumbers,
  findPreviousDevice,
  sumEnergy,
} from "@/lib/dashboard/comparison";
import type {
  DashboardDataset,
  DashboardPeriod,
} from "@/lib/dashboard/types";
import type {
  EnergyJustification,
  EnergySummary,
} from "@/lib/energy/advisor/energy-advisor.types";
import {
  clamp,
  formatAnalysisNumber,
  formatDeviceDisplayName,
  getEfficiencyStatus,
} from "@/lib/energy/advisor/energy-advisor.utils";

export type HistoricalDashboardPeriod = Exclude<
  DashboardPeriod,
  "today"
>;

export type PeriodEnergyAnalysis = {
  period: HistoricalDashboardPeriod;
  summary: EnergySummary;
  dataOrigin: "simulated";
  sourceLabel: string;
};

const PERIOD_STATUS_TITLES = {
  efficient: "Consumo eficiente no período",
  balanced: "Consumo equilibrado no período",
  attention: "Consumo do período pede atenção",
  critical: "Período com revisão prioritária",
} as const;

function createReason(
  input: Omit<
    EnergyJustification,
    "scoreChange" | "scoreImpact" | "tone"
  > & {
    scoreImpact: number;
  },
): EnergyJustification {
  return {
    ...input,
    scoreChange: input.scoreImpact,
    tone: input.scoreImpact < 0 ? "negative" : "positive",
  };
}

function buildEmptySummary(): EnergySummary {
  const reasons = [
    createReason({
      id: "historical-insufficient-data",
      type: "balanced",
      label: "Base histórica insuficiente",
      description:
        "O período não possui consumo simulado suficiente para avaliar padrões.",
      scoreImpact: 0,
    }),
  ];

  return {
    score: 75,
    status: "balanced",
    title: "Aguardando dados do período",
    description:
      "O índice permanece neutro até que existam valores simulados válidos.",
    isDemonstrative: true,
    reasons,
    justifications: reasons,
  };
}

export function buildPeriodEnergyAnalysis(
  period: HistoricalDashboardPeriod,
  current: DashboardDataset,
  previous: DashboardDataset,
): PeriodEnergyAnalysis {
  const totalKwh = sumEnergy(current.energyUsage);

  if (totalKwh <= 0) {
    return {
      period,
      summary: buildEmptySummary(),
      dataOrigin: "simulated",
      sourceLabel:
        "Índice demonstrativo calculado somente com o histórico simulado do período.",
    };
  }

  const previousTotalKwh = sumEnergy(previous.energyUsage);
  const overallComparison = compareNumbers(
    totalKwh,
    previousTotalKwh,
    previous.label,
  );
  const devices = current.deviceConsumption.toSorted(
    (first, second) =>
      second.consumptionKwh - first.consumptionKwh ||
      first.device.localeCompare(second.device, "pt-BR") ||
      first.id.localeCompare(second.id),
  );
  const leader = devices[0];
  const topTwoKwh = devices
    .slice(0, 2)
    .reduce((total, device) => total + device.consumptionKwh, 0);
  const leaderShare = leader
    ? leader.consumptionKwh / totalKwh
    : 0;
  const topTwoShare = topTwoKwh / totalKwh;
  const dailyAverage = totalKwh / current.daysCount;
  const peak = current.energyUsage.reduce((currentPeak, point) =>
    point.consumptionKwh > currentPeak.consumptionKwh
      ? point
      : currentPeak,
  );
  const peakRatio =
    dailyAverage === 0 ? 0 : peak.consumptionKwh / dailyAverage;
  const weekendPoints = current.energyUsage.filter(
    (point) => point.isWeekend,
  );
  const weekdayPoints = current.energyUsage.filter(
    (point) => !point.isWeekend,
  );
  const weekendAverage =
    weekendPoints.length === 0
      ? 0
      : weekendPoints.reduce(
          (total, point) => total + point.consumptionKwh,
          0,
        ) / weekendPoints.length;
  const weekdayAverage =
    weekdayPoints.length === 0
      ? 0
      : weekdayPoints.reduce(
          (total, point) => total + point.consumptionKwh,
          0,
        ) / weekdayPoints.length;
  const weekendRatio =
    weekdayAverage === 0 ? 0 : weekendAverage / weekdayAverage;
  const largestDeviceVariation = devices
    .map((device) => {
      const previousDevice = findPreviousDevice(
        device,
        previous.deviceConsumption,
      );

      return previousDevice
        ? {
            device,
            comparison: compareNumbers(
              device.consumptionKwh,
              previousDevice.consumptionKwh,
              previous.label,
            ),
          }
        : undefined;
    })
    .filter(
      (
        item,
      ): item is {
        device: (typeof devices)[number];
        comparison: ReturnType<typeof compareNumbers>;
      } => item !== undefined,
    )
    .toSorted(
      (first, second) =>
        Math.abs(second.comparison.percentageChange ?? 0) -
          Math.abs(first.comparison.percentageChange ?? 0) ||
        first.device.device.localeCompare(
          second.device.device,
          "pt-BR",
        ),
    )[0];
  const reasons: EnergyJustification[] = [];
  let score = 100;
  const deduct = (
    reason: Omit<
      EnergyJustification,
      "scoreChange" | "scoreImpact" | "tone"
    >,
    impact: number,
  ) => {
    score -= impact;
    reasons.push(
      createReason({
        ...reason,
        scoreImpact: -impact,
      }),
    );
  };

  if (
    leader &&
    leaderShare >=
      PERIOD_EFFICIENCY_LIMITS.severeDeviceConcentration
  ) {
    deduct(
      {
        id: "historical-device-concentration",
        type: "concentration",
        label: "Concentração elevada",
        description: `${formatDeviceDisplayName(leader.device)} concentrou ${formatAnalysisNumber(leaderShare * 100)}% do consumo do período.`,
        evidence: {
          percentage: leaderShare * 100,
          consumptionKwh: leader.consumptionKwh,
          deviceName: formatDeviceDisplayName(leader.device),
        },
      },
      PERIOD_SCORE_IMPACTS.severeDeviceConcentration,
    );
  } else if (
    leader &&
    leaderShare >=
      PERIOD_EFFICIENCY_LIMITS.moderateDeviceConcentration
  ) {
    deduct(
      {
        id: "historical-device-concentration",
        type: "concentration",
        label: "Maior dispositivo em destaque",
        description: `${formatDeviceDisplayName(leader.device)} concentrou ${formatAnalysisNumber(leaderShare * 100)}% do consumo do período.`,
        evidence: {
          percentage: leaderShare * 100,
          consumptionKwh: leader.consumptionKwh,
          deviceName: formatDeviceDisplayName(leader.device),
        },
      },
      PERIOD_SCORE_IMPACTS.deviceConcentration,
    );
  }

  if (
    devices.length >= 2 &&
    topTwoShare >=
      PERIOD_EFFICIENCY_LIMITS.severeTopTwoConcentration
  ) {
    deduct(
      {
        id: "historical-top-two-concentration",
        type: "concentration",
        label: "Distribuição muito concentrada",
        description: `Os dois maiores dispositivos responderam por ${formatAnalysisNumber(topTwoShare * 100)}% do consumo.`,
        evidence: {
          percentage: topTwoShare * 100,
          deviceCount: 2,
        },
      },
      PERIOD_SCORE_IMPACTS.severeTopTwoConcentration,
    );
  } else if (
    devices.length >= 2 &&
    topTwoShare >=
      PERIOD_EFFICIENCY_LIMITS.moderateTopTwoConcentration
  ) {
    deduct(
      {
        id: "historical-top-two-concentration",
        type: "concentration",
        label: "Concentração nos dois maiores",
        description: `Os dois maiores dispositivos responderam por ${formatAnalysisNumber(topTwoShare * 100)}% do consumo.`,
        evidence: {
          percentage: topTwoShare * 100,
          deviceCount: 2,
        },
      },
      PERIOD_SCORE_IMPACTS.topTwoConcentration,
    );
  }

  const comparisonPercentage =
    overallComparison.percentageChange ?? 0;

  if (
    comparisonPercentage >=
    PERIOD_EFFICIENCY_LIMITS.relevantIncrease
  ) {
    deduct(
      {
        id: "historical-period-variation",
        type: "variation",
        label: "Aumento relevante",
        description: `O consumo aumentou ${formatAnalysisNumber(comparisonPercentage * 100)}% em relação a ${previous.label.toLocaleLowerCase("pt-BR")}.`,
        evidence: {
          comparisonPercentage: comparisonPercentage * 100,
          consumptionKwh: totalKwh,
        },
      },
      PERIOD_SCORE_IMPACTS.relevantPeriodIncrease,
    );
  } else if (
    comparisonPercentage >=
    PERIOD_EFFICIENCY_LIMITS.moderateIncrease
  ) {
    deduct(
      {
        id: "historical-period-variation",
        type: "variation",
        label: "Aumento moderado",
        description: `O consumo aumentou ${formatAnalysisNumber(comparisonPercentage * 100)}% em relação a ${previous.label.toLocaleLowerCase("pt-BR")}.`,
        evidence: {
          comparisonPercentage: comparisonPercentage * 100,
          consumptionKwh: totalKwh,
        },
      },
      PERIOD_SCORE_IMPACTS.periodIncrease,
    );
  } else if (
    Math.abs(comparisonPercentage) <
    PERIOD_EFFICIENCY_LIMITS.stableVariation
  ) {
    reasons.push(
      createReason({
        id: "historical-stable-variation",
        type: "balanced",
        label: "Variação estável",
        description: `A diferença para ${previous.label.toLocaleLowerCase("pt-BR")} ficou abaixo de 2%.`,
        scoreImpact: 0,
        evidence: {
          comparisonPercentage: comparisonPercentage * 100,
        },
      }),
    );
  }

  if (peakRatio >= PERIOD_EFFICIENCY_LIMITS.relevantPeakRatio) {
    deduct(
      {
        id: "historical-peak",
        type: "peak",
        label: "Pico muito acima da média",
        description: `${peak.label} registrou ${formatAnalysisNumber(peakRatio, 2)} vezes a média diária.`,
        evidence: {
          peakRatio,
          consumptionKwh: peak.consumptionKwh,
        },
      },
      PERIOD_SCORE_IMPACTS.relevantPeak,
    );
  } else if (
    peakRatio >= PERIOD_EFFICIENCY_LIMITS.moderatePeakRatio
  ) {
    deduct(
      {
        id: "historical-peak",
        type: "peak",
        label: "Pico acima da média",
        description: `${peak.label} registrou ${formatAnalysisNumber(peakRatio, 2)} vezes a média diária.`,
        evidence: {
          peakRatio,
          consumptionKwh: peak.consumptionKwh,
        },
      },
      PERIOD_SCORE_IMPACTS.peak,
    );
  }

  if (
    weekendRatio >=
    PERIOD_EFFICIENCY_LIMITS.relevantWeekendRatio
  ) {
    deduct(
      {
        id: "historical-weekend",
        type: "weekend",
        label: "Finais de semana elevados",
        description: `A média dos finais de semana ficou ${formatAnalysisNumber((weekendRatio - 1) * 100)}% acima dos demais dias.`,
        evidence: {
          percentage: (weekendRatio - 1) * 100,
        },
      },
      PERIOD_SCORE_IMPACTS.relevantWeekend,
    );
  } else if (
    weekendRatio >=
    PERIOD_EFFICIENCY_LIMITS.moderateWeekendRatio
  ) {
    deduct(
      {
        id: "historical-weekend",
        type: "weekend",
        label: "Finais de semana em atenção",
        description: `A média dos finais de semana ficou ${formatAnalysisNumber((weekendRatio - 1) * 100)}% acima dos demais dias.`,
        evidence: {
          percentage: (weekendRatio - 1) * 100,
        },
      },
      PERIOD_SCORE_IMPACTS.weekend,
    );
  }

  const deviceVariation = Math.abs(
    largestDeviceVariation?.comparison.percentageChange ?? 0,
  );

  if (
    largestDeviceVariation &&
    deviceVariation >=
      PERIOD_EFFICIENCY_LIMITS.relevantDeviceVariation
  ) {
    deduct(
      {
        id: "historical-device-variation",
        type: "variation",
        label: "Mudança relevante por dispositivo",
        description: `${formatDeviceDisplayName(largestDeviceVariation.device.device)} variou ${formatAnalysisNumber(deviceVariation * 100)}% no comparativo.`,
        evidence: {
          deviceName: formatDeviceDisplayName(
            largestDeviceVariation.device.device,
          ),
          comparisonPercentage: deviceVariation * 100,
        },
      },
      PERIOD_SCORE_IMPACTS.relevantDeviceVariation,
    );
  } else if (
    largestDeviceVariation &&
    deviceVariation >=
      PERIOD_EFFICIENCY_LIMITS.moderateDeviceVariation
  ) {
    deduct(
      {
        id: "historical-device-variation",
        type: "variation",
        label: "Mudança por dispositivo",
        description: `${formatDeviceDisplayName(largestDeviceVariation.device.device)} variou ${formatAnalysisNumber(deviceVariation * 100)}% no comparativo.`,
        evidence: {
          deviceName: formatDeviceDisplayName(
            largestDeviceVariation.device.device,
          ),
          comparisonPercentage: deviceVariation * 100,
        },
      },
      PERIOD_SCORE_IMPACTS.deviceVariation,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      createReason({
        id: "historical-balanced-distribution",
        type: "balanced",
        label: "Distribuição equilibrada",
        description:
          "Nenhuma regra demonstrativa de concentração, pico ou variação relevante foi acionada.",
        scoreImpact: 0,
      }),
    );
  }

  const sortedReasons = reasons.toSorted(
    (first, second) =>
      Math.abs(second.scoreImpact) -
        Math.abs(first.scoreImpact) ||
      first.id.localeCompare(second.id),
  );
  const normalizedScore = Math.round(clamp(score, 0, 100));
  const status = getEfficiencyStatus(normalizedScore);
  const variationText =
    comparisonPercentage > 0
      ? `O consumo aumentou ${formatAnalysisNumber(comparisonPercentage * 100)}%`
      : comparisonPercentage < 0
        ? `O consumo reduziu ${formatAnalysisNumber(Math.abs(comparisonPercentage) * 100)}%`
        : "O consumo permaneceu estável";
  const concentrationText = leader
    ? `o maior dispositivo concentrou ${formatAnalysisNumber(leaderShare * 100)}%`
    : "a distribuição por dispositivo não estava disponível";
  const summary: EnergySummary = {
    score: normalizedScore,
    status,
    title: PERIOD_STATUS_TITLES[status],
    description: `${variationText}, e ${concentrationText}.`,
    isDemonstrative: true,
    reasons: sortedReasons,
    justifications: sortedReasons,
  };

  return {
    period,
    summary,
    dataOrigin: "simulated",
    sourceLabel:
      "Índice demonstrativo calculado somente com datasets históricos simulados; não é diretamente comparável ao índice de Hoje.",
  };
}

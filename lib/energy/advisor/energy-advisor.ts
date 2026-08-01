import {
  CO2_KG_PER_KWH,
  CO2_SOURCE_LABEL,
  ENERGY_ADVISOR_LIMITS,
  ENERGY_STATUS_LABELS,
  SCORE_DEDUCTIONS,
} from "@/lib/energy/advisor/energy-advisor.constants";
import { buildDeviceSavingOpportunities } from "@/lib/energy/advisor/energy-opportunities";
import {
  buildAdvisorContext,
  buildContextualRecommendations,
  buildEnergyRecommendations,
} from "@/lib/energy/advisor/energy-advisor.rules";
import type {
  EnergyAdvisorAlert,
  EnergyAdvisorOptions,
  EnergyAnalysis,
  EnergyEfficiencyEvidence,
  EnergyEfficiencyReasonType,
  EnergyJustification,
  EnergyRecommendation,
} from "@/lib/energy/advisor/energy-advisor.types";
import {
  calculateSavingsPotential,
  clamp,
  formatAnalysisNumber,
  formatDeviceDisplayName,
  getEfficiencyStatus,
  round,
  sortAlerts,
  sortRecommendations,
  toFiniteNonNegative,
} from "@/lib/energy/advisor/energy-advisor.utils";
import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";
import type { TodayEnergySnapshot } from "@/lib/energy/energy-engine.types";

function calculateScore(
  context: ReturnType<typeof buildAdvisorContext>,
) {
  const { snapshot, leader } = context;

  if (
    snapshot.activeDeviceCount === 0 ||
    snapshot.totalConsumptionKwh === 0
  ) {
    return {
      score: 75,
      justifications: [
        {
          id: "insufficient-data",
          type: "balanced",
          label: "Base insuficiente",
          description:
            "Não há consumo ativo para avaliar padrões; o estado permanece neutro.",
          scoreImpact: 0,
          scoreChange: 0,
          tone: "neutral",
        },
      ] satisfies readonly EnergyJustification[],
    };
  }

  const justifications: EnergyJustification[] = [];
  let score = 100;
  const addDeduction = (
    id: string,
    type: EnergyEfficiencyReasonType,
    label: string,
    description: string,
    value: number,
    evidence?: EnergyEfficiencyEvidence,
  ) => {
    score -= value;
    justifications.push({
      id,
      type,
      label,
      description,
      scoreImpact: -value,
      scoreChange: -value,
      tone: "negative",
      evidence,
    });
  };

  if (
    leader &&
    leader.percentage >=
      ENERGY_ADVISOR_LIMITS.severeConcentrationPercentage
  ) {
    addDeduction(
      "concentration",
      "concentration",
      "Concentração elevada",
      `${formatAnalysisNumber(
        leader.percentage,
      )}% do consumo está em ${formatDeviceDisplayName(leader.name)}.`,
      SCORE_DEDUCTIONS.severeConcentration,
      {
        percentage: leader.percentage,
        consumptionKwh: leader.consumptionKwh,
        deviceName: formatDeviceDisplayName(leader.name),
      },
    );
  } else if (
    leader &&
    leader.percentage >
      ENERGY_ADVISOR_LIMITS.excessiveConcentrationPercentage
  ) {
    addDeduction(
      "concentration",
      "concentration",
      "Consumo concentrado",
      `${formatAnalysisNumber(
        leader.percentage,
      )}% do consumo está em ${formatDeviceDisplayName(leader.name)}.`,
      SCORE_DEDUCTIONS.concentration,
      {
        percentage: leader.percentage,
        consumptionKwh: leader.consumptionKwh,
        deviceName: formatDeviceDisplayName(leader.name),
      },
    );
  }

  if (
    snapshot.metrics.eveningPercentage >=
    ENERGY_ADVISOR_LIMITS.highEveningPercentage
  ) {
    addDeduction(
      "evening",
      "evening",
      "Concentração após as 18h",
      `${formatAnalysisNumber(
        snapshot.metrics.eveningPercentage,
      )}% do consumo ocorre no período noturno.`,
      SCORE_DEDUCTIONS.highEvening,
      {
        percentage: snapshot.metrics.eveningPercentage,
        consumptionKwh: snapshot.metrics.eveningConsumptionKwh,
      },
    );
  } else if (
    snapshot.metrics.eveningPercentage >=
    ENERGY_ADVISOR_LIMITS.relevantEveningPercentage
  ) {
    addDeduction(
      "evening",
      "evening",
      "Uso noturno relevante",
      `${formatAnalysisNumber(
        snapshot.metrics.eveningPercentage,
      )}% do consumo ocorre após as 18h.`,
      SCORE_DEDUCTIONS.evening,
      {
        percentage: snapshot.metrics.eveningPercentage,
        consumptionKwh: snapshot.metrics.eveningConsumptionKwh,
      },
    );
  }

  if (
    context.peakToAverageRatio >=
    ENERGY_ADVISOR_LIMITS.highPeakRatio
  ) {
    addDeduction(
      "peak",
      "peak",
      "Pico muito acima da média",
      `O pico equivale a ${formatAnalysisNumber(
        context.peakToAverageRatio,
      )} vezes a média dos intervalos.`,
      SCORE_DEDUCTIONS.highPeak,
      {
        peakRatio: context.peakToAverageRatio,
        consumptionKwh: snapshot.metrics.peakConsumptionKwh,
      },
    );
  } else if (context.peakToAverageRatio >= 3) {
    addDeduction(
      "peak",
      "peak",
      "Pico elevado",
      `O pico equivale a ${formatAnalysisNumber(
        context.peakToAverageRatio,
      )} vezes a média dos intervalos.`,
      SCORE_DEDUCTIONS.elevatedPeak,
      {
        peakRatio: context.peakToAverageRatio,
        consumptionKwh: snapshot.metrics.peakConsumptionKwh,
      },
    );
  } else if (
    context.peakToAverageRatio >=
    ENERGY_ADVISOR_LIMITS.relevantPeakRatio
  ) {
    addDeduction(
      "peak",
      "peak",
      "Pico relevante",
      `O pico equivale a ${formatAnalysisNumber(
        context.peakToAverageRatio,
      )} vezes a média dos intervalos.`,
      SCORE_DEDUCTIONS.relevantPeak,
      {
        peakRatio: context.peakToAverageRatio,
        consumptionKwh: snapshot.metrics.peakConsumptionKwh,
      },
    );
  }

  if (context.reductionCandidate) {
    addDeduction(
      "reduction-potential",
      "savings",
      "Potencial de redução",
      `${formatDeviceDisplayName(context.reductionCandidate.name)} possui horas de uso ajustáveis no cadastro.`,
      SCORE_DEDUCTIONS.reductionPotential,
      {
        deviceName: formatDeviceDisplayName(
          context.reductionCandidate.name,
        ),
        percentage: context.reductionCandidate.percentage,
      },
    );
  }

  const highConsumptionDeduction =
    Math.min(
      context.highConsumptionDeviceCount,
      SCORE_DEDUCTIONS.maxHighConsumptionDevices,
    ) * SCORE_DEDUCTIONS.highConsumptionDevice;

  if (highConsumptionDeduction > 0) {
    addDeduction(
      "high-consumption-devices",
      "concentration",
      "Dispositivos de maior consumo",
      `${context.highConsumptionDeviceCount} dispositivo(s) superam a faixa demonstrativa de alto consumo diário.`,
      highConsumptionDeduction,
      {
        deviceCount: context.highConsumptionDeviceCount,
      },
    );
  }

  const suspiciousDeduction =
    Math.min(
      context.suspiciousDevices.length,
      SCORE_DEDUCTIONS.maxSuspiciousConfigurations,
    ) * SCORE_DEDUCTIONS.suspiciousConfiguration;

  if (suspiciousDeduction > 0) {
    addDeduction(
      "configuration",
      "configuration",
      "Cadastro para revisar",
      `${context.suspiciousDevices.length} dispositivo(s) acionaram faixas demonstrativas de conferência.`,
      suspiciousDeduction,
      {
        deviceCount: context.suspiciousDevices.length,
      },
    );
  }

  if (justifications.length === 0) {
    justifications.push({
      id: "balanced-distribution",
      type: "balanced",
      label: "Distribuição estável",
      description:
        "Nenhuma das regras demonstrativas de concentração ou pico foi acionada.",
      scoreImpact: 0,
      scoreChange: 0,
      tone: "positive",
    });
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    justifications,
  };
}

function buildSummary(
  context: ReturnType<typeof buildAdvisorContext>,
) {
  const { score, justifications } = calculateScore(context);
  const status = getEfficiencyStatus(score);
  const { snapshot, leader } = context;
  let description: string;

  if (
    snapshot.activeDeviceCount === 0 ||
    snapshot.totalConsumptionKwh === 0
  ) {
    description =
      "Ative dispositivos com dados de potência e uso para receber recomendações calculadas.";
  } else if (
    leader &&
    leader.percentage >
      ENERGY_ADVISOR_LIMITS.excessiveConcentrationPercentage
  ) {
    description = `${formatDeviceDisplayName(leader.name)} concentra ${formatAnalysisNumber(
      leader.percentage,
    )}% do consumo estimado de hoje.`;
  } else if (snapshot.metrics.peakHour) {
    description = `O pico estimado ocorreu às ${snapshot.metrics.peakHour}; o consumo está ${status === "efficient" ? "bem distribuído" : "dentro das faixas demonstrativas analisadas"}.`;
  } else {
    description =
      "Os dados atuais não apresentam consumo suficiente para explicar um pico.";
  }

  return {
    status,
    title: ENERGY_STATUS_LABELS[status],
    description,
    score,
    isDemonstrative: true as const,
    reasons: justifications,
    justifications,
  };
}

function buildHighlights(
  context: ReturnType<typeof buildAdvisorContext>,
) {
  const { snapshot, leader } = context;
  const highlights = [];

  if (snapshot.metrics.peakHour) {
    highlights.push({
      id: "peak",
      label: `Pico às ${snapshot.metrics.peakHour}`,
      value: snapshot.metrics.peakConsumptionKwh,
      unit: "energy" as const,
      description: `${formatAnalysisNumber(
        context.peakToAverageRatio,
      )}× a média por intervalo`,
    });
  }

  highlights.push({
    id: "evening",
    label: "Consumo após as 18h",
    value: snapshot.metrics.eveningPercentage,
    unit: "percent" as const,
    description: `${formatAnalysisNumber(
      snapshot.metrics.eveningConsumptionKwh,
    )} kWh estimados`,
  });

  if (leader) {
    highlights.push({
      id: "leader",
      label: formatDeviceDisplayName(leader.name),
      value: leader.percentage,
      unit: "percent" as const,
      description: "maior participação no consumo",
    });
  }

  return highlights;
}

function alertFromRecommendation(
  recommendation: EnergyRecommendation,
  context: ReturnType<typeof buildAdvisorContext>,
): EnergyAdvisorAlert | undefined {
  const evidence = [];

  if (recommendation.evidence.currentPercentage !== undefined) {
    evidence.push({
      label: "Participação",
      value: `${formatAnalysisNumber(
        recommendation.evidence.currentPercentage,
      )}%`,
    });
  }

  if (recommendation.evidence.peakHour) {
    evidence.push({
      label: "Horário do pico",
      value: recommendation.evidence.peakHour,
    });
  }

  if (recommendation.evidence.eveningPercentage !== undefined) {
    evidence.push({
      label: "Após as 18h",
      value: `${formatAnalysisNumber(
        recommendation.evidence.eveningPercentage,
      )}%`,
    });
  }

  const shared = {
    recommendationId: recommendation.id,
    dataOrigin: "estimated" as const,
    estimatedImpactMonthlyBrl:
      recommendation.impact.monthlyBrl,
    relevance: recommendation.relevance,
    evidence,
  };

  switch (recommendation.type) {
    case "configuration_review":
      return recommendation.id === "activate-devices"
        ? undefined
        : {
            ...shared,
            id: `alert-${recommendation.id}`,
            category: "configuration",
            severity: recommendation.priority,
            title: recommendation.title,
            description: recommendation.description,
          };
    case "high_concentration":
      return {
        ...shared,
        id: `alert-${recommendation.id}`,
        category: "concentration",
        severity:
          (recommendation.evidence.currentPercentage ?? 0) >=
          ENERGY_ADVISOR_LIMITS.severeConcentrationPercentage
            ? "high"
            : "medium",
        title: recommendation.title,
        description: recommendation.description,
      };
    case "shift_schedule":
      return {
        ...shared,
        id: `alert-${recommendation.id}`,
        category: "schedule",
        severity:
          context.snapshot.metrics.eveningPercentage >=
          ENERGY_ADVISOR_LIMITS.highEveningPercentage
            ? "medium"
            : "low",
        title: recommendation.title,
        description: recommendation.description,
      };
    case "peak_reduction":
      return {
        ...shared,
        id: `alert-${recommendation.id}`,
        category: "peak",
        severity:
          context.peakToAverageRatio >=
          ENERGY_ADVISOR_LIMITS.highPeakRatio
            ? "high"
            : "medium",
        title: recommendation.title,
        description: recommendation.description,
      };
    case "reduce_usage":
      return {
        ...shared,
        id: `alert-${recommendation.id}`,
        category: "savings",
        severity: "low",
        title: "Economia potencial identificada",
        description: recommendation.description,
      };
    case "balanced_usage":
    case "standby":
      return undefined;
  }
}

function buildAlerts(
  context: ReturnType<typeof buildAdvisorContext>,
  recommendations: readonly EnergyRecommendation[],
) {
  const alerts = recommendations
    .map((recommendation) =>
      alertFromRecommendation(recommendation, context),
    )
    .filter(
      (alert): alert is EnergyAdvisorAlert =>
        alert !== undefined,
    );

  return sortAlerts(alerts).slice(
    0,
    ENERGY_ADVISOR_LIMITS.maxAlerts,
  );
}

export function buildEnergyAnalysis(
  snapshot: TodayEnergySnapshot,
  options: EnergyAdvisorOptions = {},
): EnergyAnalysis {
  const tariffBrlPerKwh =
    options.tariffBrlPerKwh === undefined
      ? DEFAULT_ENERGY_TARIFF_BRL_PER_KWH
      : toFiniteNonNegative(options.tariffBrlPerKwh);
  const context = buildAdvisorContext(snapshot, tariffBrlPerKwh);
  const opportunities = buildDeviceSavingOpportunities(context);
  const allRecommendations = sortRecommendations(
    buildEnergyRecommendations(context, opportunities),
  );
  const recommendations = allRecommendations.slice(
    0,
    ENERGY_ADVISOR_LIMITS.maxRecommendations,
  );
  const primaryFinancialRecommendation = allRecommendations.find(
    (recommendation) =>
      recommendation.savingsStrategy === "cumulative" &&
      recommendation.impact.monthlyBrl > 0,
  );
  const primaryRecommendationSavings =
    primaryFinancialRecommendation?.impact ?? {
      dailyKwh: 0,
      monthlyKwh: 0,
      monthlyBrl: 0,
      annualBrl: 0,
    };
  const combinedSavingsPotential =
    calculateSavingsPotential(allRecommendations);
  const financialOpportunityCount = new Set(
    opportunities
      .filter(
        (opportunity) =>
          opportunity.cumulative &&
          opportunity.savings.monthlyBrl > 0 &&
          opportunity.savingsGroupId,
      )
      .map((opportunity) => opportunity.savingsGroupId),
  ).size;
  const includeEnvironmentalImpact =
    options.includeEnvironmentalImpact ?? true;
  const alertRecommendations = [
    ...new Map(
      [
        ...allRecommendations,
        ...buildContextualRecommendations(context),
      ].map((recommendation) => [
        recommendation.id,
        recommendation,
      ]),
    ).values(),
  ];

  return {
    summary: buildSummary(context),
    highlights: buildHighlights(context),
    recommendations,
    opportunities,
    alerts: buildAlerts(context, alertRecommendations),
    primaryRecommendationSavings,
    combinedSavingsPotential,
    financialOpportunityCount,
    savingsPotential: combinedSavingsPotential,
    environmentalImpact: includeEnvironmentalImpact
      ? {
          monthlyCo2KgAvoided: round(
            combinedSavingsPotential.monthlyKwh *
              CO2_KG_PER_KWH,
          ),
          annualCo2KgAvoided: round(
            combinedSavingsPotential.monthlyKwh *
              CO2_KG_PER_KWH *
              12,
          ),
          sourceLabel: CO2_SOURCE_LABEL,
          isDemonstrative: true,
        }
      : undefined,
    dataOrigin: "estimated",
  };
}

export type {
  EnergyAdvisorOptions,
  EnergyAnalysis,
  EnergyRecommendation,
} from "@/lib/energy/advisor/energy-advisor.types";

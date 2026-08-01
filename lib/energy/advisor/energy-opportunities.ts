import {
  ENERGY_ADVISOR_LIMITS,
  FLEXIBLE_DEVICE_NAME_PRIORITY,
  FRIENDLY_REDUCTION_MINUTES,
  GENERIC_DEVICE_NAMES,
  OPPORTUNITY_PRIORITY_THRESHOLDS,
  OPPORTUNITY_WEIGHTS,
  USAGE_REDUCTION_MINUTES,
} from "@/lib/energy/advisor/energy-advisor.constants";
import type {
  DeviceSavingOpportunity,
  DeviceSavingStrategy,
  EnergyAdvisorContext,
  EnergyRecommendation,
  EnergyRecommendationPriority,
} from "@/lib/energy/advisor/energy-advisor.types";
import {
  buildSavingsImpact,
  formatAnalysisNumber,
  formatDeviceDisplayName,
  isEssentialDevice,
  normalizeText,
  round,
  sortOpportunities,
  zeroImpact,
} from "@/lib/energy/advisor/energy-advisor.utils";
import type { TodayDeviceDistribution } from "@/lib/energy/energy-engine.types";
import { parseHour } from "@/lib/energy/energy-engine.utils";

function isGenericDevice(device: TodayDeviceDistribution) {
  const normalizedName = normalizeText(device.name);

  return GENERIC_DEVICE_NAMES.some(
    (name) => normalizedName === normalizeText(name),
  );
}

function isScheduleFlexibleDevice(device: TodayDeviceDistribution) {
  const normalizedName = normalizeText(device.name);

  return (
    FLEXIBLE_DEVICE_NAME_PRIORITY.some((fragment) =>
      normalizedName.includes(normalizeText(fragment)),
    ) ||
    normalizedName.includes("flexivel") ||
    ["Lavanderia", "Cozinha"].some(
      (category) =>
        normalizeText(category) === normalizeText(device.category),
    )
  );
}

function getEveningConsumptionPercentage(
  context: EnergyAdvisorContext,
  device: TodayDeviceDistribution,
) {
  if (device.consumptionKwh <= 0) {
    return 0;
  }

  const timeline = context.snapshot.deviceTimelines.find(
    (item) => item.deviceId === device.deviceId,
  );
  const eveningConsumption =
    timeline?.intervals
      .filter((point) => parseHour(point.hour) >= 18)
      .reduce((total, point) => total + point.consumptionKwh, 0) ?? 0;

  return round((eveningConsumption / device.consumptionKwh) * 100);
}

function getPeakContributionPercentage(
  context: EnergyAdvisorContext,
  deviceId: string,
) {
  return (
    context.snapshot.peakContributors.find(
      (contributor) => contributor.deviceId === deviceId,
    )?.percentageOfPeak ?? 0
  );
}

function getBaseReductionMinutes(averageDailyHours: number) {
  if (averageDailyHours <= 1) {
    return USAGE_REDUCTION_MINUTES.upToOneHour;
  }

  if (averageDailyHours <= 3) {
    return USAGE_REDUCTION_MINUTES.upToThreeHours;
  }

  if (averageDailyHours <= 6) {
    return USAGE_REDUCTION_MINUTES.upToSixHours;
  }

  return USAGE_REDUCTION_MINUTES.aboveSixHours;
}

export function getSuggestedReduction(
  averageDailyHours: number,
) {
  if (!Number.isFinite(averageDailyHours) || averageDailyHours <= 0) {
    return {
      hours: 0,
      minutes: 0,
      percentage: 0,
    };
  }

  const currentMinutes = averageDailyHours * 60;
  const maximumSafeMinutes =
    currentMinutes *
    (ENERGY_ADVISOR_LIMITS.maximumUsageReductionPercentage / 100);
  const maximumMinutes = Math.min(
    currentMinutes,
    maximumSafeMinutes,
    getBaseReductionMinutes(averageDailyHours),
  );
  const minutes =
    FRIENDLY_REDUCTION_MINUTES.find(
      (candidate) => candidate <= maximumMinutes,
    ) ?? 0;
  const hours = minutes / 60;

  return {
    hours,
    minutes,
    percentage:
      averageDailyHours === 0
        ? 0
        : round((hours / averageDailyHours) * 100, 2),
  };
}

function getConfidence(
  device: TodayDeviceDistribution,
  strategy: DeviceSavingStrategy,
) {
  if (strategy === "review_configuration") {
    return 0.6;
  }

  if (strategy === "shift_schedule") {
    return 0.8;
  }

  const category = normalizeText(device.category);

  if (category === normalizeText("Eletrônicos")) {
    return 0.95;
  }

  if (category === normalizeText("Aquecimento")) {
    return 0.7;
  }

  return 0.85;
}

function getCategoryEaseScore(category: string) {
  const entry = Object.entries(
    OPPORTUNITY_WEIGHTS.categoryEase,
  ).find(
    ([knownCategory]) =>
      normalizeText(knownCategory) === normalizeText(category),
  );

  return entry?.[1] ?? 0;
}

function calculateOpportunityScore(input: {
  device: TodayDeviceDistribution;
  strategy: DeviceSavingStrategy;
  savingsMonthlyBrl: number;
  peakContributionPercentage: number;
  eveningConsumptionPercentage: number;
  confidence: number;
  essential: boolean;
  uncertain: boolean;
}) {
  const savingsScore = Math.min(
    input.savingsMonthlyBrl *
      OPPORTUNITY_WEIGHTS.savingsBrlMultiplier,
    OPPORTUNITY_WEIGHTS.maximumSavingsScore,
  );
  const score =
    savingsScore +
    input.device.percentage *
      OPPORTUNITY_WEIGHTS.consumptionShareMultiplier +
    OPPORTUNITY_WEIGHTS.strategy[input.strategy] +
    getCategoryEaseScore(input.device.category) +
    input.peakContributionPercentage *
      OPPORTUNITY_WEIGHTS.peakContributionMultiplier +
    input.eveningConsumptionPercentage *
      OPPORTUNITY_WEIGHTS.eveningContributionMultiplier +
    input.confidence * OPPORTUNITY_WEIGHTS.confidenceMultiplier -
    (input.essential ? OPPORTUNITY_WEIGHTS.essentialPenalty : 0) -
    (input.uncertain ? OPPORTUNITY_WEIGHTS.uncertaintyPenalty : 0);

  return round(Math.max(0, score), 2);
}

function getPriority(
  opportunityScore: number,
): EnergyRecommendationPriority {
  if (opportunityScore >= OPPORTUNITY_PRIORITY_THRESHOLDS.high) {
    return "high";
  }

  if (opportunityScore >= OPPORTUNITY_PRIORITY_THRESHOLDS.medium) {
    return "medium";
  }

  return "low";
}

function buildOpportunity(
  context: EnergyAdvisorContext,
  device: TodayDeviceDistribution,
): DeviceSavingOpportunity {
  const displayName = formatDeviceDisplayName(device.name);
  const suspicious = context.suspiciousDevices.find(
    (item) => item.device.deviceId === device.deviceId,
  );
  const essential = isEssentialDevice(device);
  const generic = isGenericDevice(device);
  const scheduleFlexible = isScheduleFlexibleDevice(device);
  const eveningConsumptionPercentage =
    getEveningConsumptionPercentage(context, device);
  const peakContributionPercentage =
    getPeakContributionPercentage(context, device.deviceId);
  const reduction = getSuggestedReduction(device.averageDailyHours);
  const calculatedSavings = buildSavingsImpact(
    (device.powerWatts * reduction.hours) / 1_000,
    context.tariffBrlPerKwh,
  );

  let eligibility: DeviceSavingOpportunity["eligibility"];
  let strategy: DeviceSavingStrategy;
  let reason: string;
  let savings = zeroImpact();
  let suggestion: DeviceSavingOpportunity["suggestion"];
  let cumulative = false;
  let configurationReasons: readonly string[] | undefined;

  if (suspicious) {
    eligibility = "invalid_configuration";
    strategy = "review_configuration";
    reason = `Revise o cadastro: ${suspicious.reasons.join(" e ")}.`;
    configurationReasons = suspicious.reasons;
  } else if (device.consumptionKwh <= 0 || device.powerWatts <= 0) {
    eligibility = "zero_consumption";
    strategy = "review_configuration";
    reason =
      "Sem consumo calculável com a potência e o tempo de uso atuais.";
  } else if (generic) {
    eligibility = "invalid_configuration";
    strategy = "review_configuration";
    reason = `Detalhe quais aparelhos estão agrupados em “${displayName}” para obter recomendações mais precisas.`;
  } else if (essential) {
    eligibility = "essential";
    strategy = "maintain_current_usage";
    reason =
      "Equipamento de uso essencial ou contínuo; nenhuma redução direta de tempo é recomendada.";
  } else if (scheduleFlexible) {
    if (
      eveningConsumptionPercentage >= 20 ||
      peakContributionPercentage > 0
    ) {
      eligibility = "eligible";
      strategy = "shift_schedule";
      reason =
        "O perfil cadastrado contribui para o período de maior concentração; deslocar o uso reduz o pico, mas não o custo com a tarifa atual.";
      suggestion = {
        preferredStartHour: 10,
        preferredEndHour: 17,
      };
    } else {
      eligibility = "not_recommended";
      strategy = "maintain_current_usage";
      reason =
        "O horário cadastrado já está fora do pico estimado; não há mudança de rotina relevante a sugerir.";
    }
  } else if (reduction.minutes === 0) {
    eligibility = "insufficient_usage";
    strategy = "maintain_current_usage";
    reason =
      "O tempo diário cadastrado é insuficiente para uma redução simples e segura.";
  } else if (
    calculatedSavings.monthlyBrl <
    ENERGY_ADVISOR_LIMITS.minimumFinancialSavingsMonthlyBrl
  ) {
    eligibility = "insufficient_usage";
    strategy = "maintain_current_usage";
    reason =
      "A economia mensal calculada ficaria abaixo do limite mínimo demonstrativo.";
  } else {
    eligibility = "eligible";
    strategy = "reduce_usage";
    reason = `${displayName} representa ${formatAnalysisNumber(
      device.percentage,
    )}% do consumo e possui ${formatAnalysisNumber(
      device.averageDailyHours,
      2,
    )} h/dia cadastradas.`;
    savings = calculatedSavings;
    suggestion = {
      hoursReduction: reduction.hours,
      minutesReduction: reduction.minutes,
      percentageReduction: reduction.percentage,
    };
    cumulative = true;
  }

  const confidence = getConfidence(device, strategy);
  const opportunityScore = calculateOpportunityScore({
    device,
    strategy,
    savingsMonthlyBrl: savings.monthlyBrl,
    peakContributionPercentage,
    eveningConsumptionPercentage,
    confidence,
    essential,
    uncertain:
      eligibility === "invalid_configuration" ||
      eligibility === "insufficient_usage",
  });
  const savingsGroupId = cumulative
    ? `device-time-reduction-${device.deviceId}`
    : undefined;

  return {
    id: `opportunity-${device.deviceId}-${strategy}`,
    deviceId: device.deviceId,
    deviceName: displayName,
    category: device.category,
    eligibility,
    strategy,
    priority: getPriority(opportunityScore),
    opportunityScore,
    confidence,
    current: {
      dailyConsumptionKwh: device.consumptionKwh,
      consumptionPercentage: device.percentage,
      averageDailyHours: device.averageDailyHours,
      powerWatts: device.powerWatts,
      currentRank: device.ranking,
    },
    suggestion,
    savings,
    evidence: {
      reason,
      configurationReasons,
      peakContributionPercentage:
        peakContributionPercentage > 0
          ? peakContributionPercentage
          : undefined,
      eveningConsumptionPercentage,
      currentRank: device.ranking,
    },
    savingsGroupId,
    exclusivityGroup: savingsGroupId,
    cumulative,
  };
}

export function buildDeviceSavingOpportunities(
  context: EnergyAdvisorContext,
) {
  return sortOpportunities(
    context.snapshot.distribution.map((device) =>
      buildOpportunity(context, device),
    ),
  );
}

function toRecommendation(
  opportunity: DeviceSavingOpportunity,
): EnergyRecommendation | undefined {
  const shared = {
    deviceId: opportunity.deviceId,
    deviceName: opportunity.deviceName,
    priority: opportunity.priority,
    impact: opportunity.savings,
    evidence: {
      currentConsumptionKwh:
        opportunity.current.dailyConsumptionKwh,
      currentPercentage:
        opportunity.current.consumptionPercentage,
      currentRank: opportunity.current.currentRank,
      usageReductionPercentage:
        opportunity.suggestion?.percentageReduction,
      eligibilityReason: opportunity.evidence.reason,
      configurationReasons:
        opportunity.evidence.configurationReasons,
    },
    savingsStrategy: opportunity.cumulative
      ? ("cumulative" as const)
      : ("none" as const),
    savingsGroupId: opportunity.savingsGroupId,
    relevance: 100 + opportunity.opportunityScore,
  };

  if (
    opportunity.eligibility === "eligible" &&
    opportunity.strategy === "reduce_usage" &&
    opportunity.suggestion?.minutesReduction
  ) {
    const minutes = opportunity.suggestion.minutesReduction;
    const percentage = opportunity.suggestion.percentageReduction ?? 0;

    return {
      ...shared,
      id: `reduce-usage-${opportunity.deviceId}`,
      type: "reduce_usage",
      title: `Reduza ${minutes} min/dia de ${opportunity.deviceName}`,
      description: `A redução equivale a aproximadamente ${formatAnalysisNumber(
        percentage,
      )}% do uso diário cadastrado e pode evitar ${formatAnalysisNumber(
        opportunity.savings.monthlyKwh,
      )} kWh por mês.`,
      action: {
        label: `Experimentar ${minutes} minutos a menos por dia`,
        suggestedHoursReduction:
          opportunity.suggestion.hoursReduction,
        suggestedMinutesReduction: minutes,
        suggestedPercentageReduction: percentage,
      },
    };
  }

  if (
    opportunity.eligibility === "eligible" &&
    opportunity.strategy === "shift_schedule"
  ) {
    return {
      ...shared,
      id: `shift-schedule-${opportunity.deviceId}`,
      type: "shift_schedule",
      title: `Desloque o uso de ${opportunity.deviceName}`,
      description:
        "A mudança reduz a concentração do pico, mas não altera necessariamente o custo total com a tarifa atual.",
      action: {
        label: "Considerar o período entre 10h e 17h",
        suggestedStartHour:
          opportunity.suggestion?.preferredStartHour,
        suggestedEndHour: opportunity.suggestion?.preferredEndHour,
      },
    };
  }

  if (opportunity.eligibility === "invalid_configuration") {
    return {
      ...shared,
      id: `configuration-${opportunity.deviceId}`,
      type: "configuration_review",
      title: `Revise o cadastro de ${opportunity.deviceName}`,
      description: opportunity.evidence.reason,
      action: {
        label: "Conferir os dados cadastrados do dispositivo",
      },
    };
  }

  return undefined;
}

export function buildOpportunityRecommendations(
  opportunities: readonly DeviceSavingOpportunity[],
) {
  return opportunities
    .map(toRecommendation)
    .filter(
      (recommendation): recommendation is EnergyRecommendation =>
        recommendation !== undefined,
    );
}

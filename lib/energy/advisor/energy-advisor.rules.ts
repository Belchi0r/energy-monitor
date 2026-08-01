import {
  DEFAULT_DEVICE_CONFIGURATION_RANGE,
  DEVICE_CONFIGURATION_RANGES,
  ENERGY_ADVISOR_LIMITS,
  FLEXIBLE_DEVICE_CATEGORIES,
  FLEXIBLE_DEVICE_NAME_PRIORITY,
} from "@/lib/energy/advisor/energy-advisor.constants";
import { buildOpportunityRecommendations } from "@/lib/energy/advisor/energy-opportunities";
import type {
  DeviceSavingOpportunity,
  EnergyAdvisorContext,
  EnergyRecommendation,
  SuspiciousDevice,
} from "@/lib/energy/advisor/energy-advisor.types";
import {
  formatAnalysisNumber,
  formatDeviceDisplayName,
  isEssentialDevice,
  normalizeText,
  zeroImpact,
} from "@/lib/energy/advisor/energy-advisor.utils";
import type {
  TodayDeviceDistribution,
  TodayEnergySnapshot,
} from "@/lib/energy/energy-engine.types";
import { parseHour } from "@/lib/energy/energy-engine.utils";

function isFlexibleDevice(
  device: Pick<TodayDeviceDistribution, "name" | "category">,
) {
  return (
    !isEssentialDevice(device) &&
    FLEXIBLE_DEVICE_CATEGORIES.some(
      (category) =>
        normalizeText(category) === normalizeText(device.category),
    )
  );
}

function getEveningConsumption(
  snapshot: TodayEnergySnapshot,
  deviceId: string,
) {
  const timeline = snapshot.deviceTimelines.find(
    (item) => item.deviceId === deviceId,
  );

  return (
    timeline?.intervals
      .filter((point) => parseHour(point.hour) >= 18)
      .reduce(
        (total, point) => total + point.consumptionKwh,
        0,
      ) ?? 0
  );
}

export function findSuspiciousDevices(
  snapshot: TodayEnergySnapshot,
): readonly SuspiciousDevice[] {
  return snapshot.distribution.flatMap((device) => {
    const limits =
      DEVICE_CONFIGURATION_RANGES[device.category] ??
      DEFAULT_DEVICE_CONFIGURATION_RANGE;
    const reasons: string[] = [];

    if (device.powerWatts > limits.maxPowerWatts) {
      reasons.push(
        `potência acima da faixa demonstrativa para ${device.category}`,
      );
    }

    if (device.averageDailyHours > limits.maxDailyHours) {
      reasons.push(
        `horas de uso acima da faixa demonstrativa para ${device.category}`,
      );
    }

    if (device.usageProfileFallbackUsed) {
      reasons.push("perfil de uso substituído por um fallback seguro");
    }

    return reasons.length > 0 ? [{ device, reasons }] : [];
  });
}

export function buildAdvisorContext(
  snapshot: TodayEnergySnapshot,
  tariffBrlPerKwh: number,
): EnergyAdvisorContext {
  const leader = snapshot.distribution[0];
  const reductionCandidate = snapshot.distribution.find(
    (device) =>
      !isEssentialDevice(device) &&
      device.percentage >=
        ENERGY_ADVISOR_LIMITS.relevantDevicePercentage &&
      device.consumptionKwh >=
        ENERGY_ADVISOR_LIMITS.significantConsumptionKwh &&
      device.averageDailyHours >=
        ENERGY_ADVISOR_LIMITS.minimumReducibleHours &&
      device.powerWatts > 0,
  );
  const eveningCandidates = snapshot.distribution
    .filter(isFlexibleDevice)
    .map((device) => ({
      device,
      eveningConsumptionKwh: getEveningConsumption(
        snapshot,
        device.deviceId,
      ),
      priority:
        FLEXIBLE_DEVICE_NAME_PRIORITY.findIndex((fragment) =>
          normalizeText(device.name).includes(fragment),
        ) + 1,
    }))
    .filter((item) => item.eveningConsumptionKwh > 0)
    .toSorted(
      (first, second) =>
        (first.priority || Number.MAX_SAFE_INTEGER) -
          (second.priority || Number.MAX_SAFE_INTEGER) ||
        second.eveningConsumptionKwh -
          first.eveningConsumptionKwh ||
        first.device.name.localeCompare(
          second.device.name,
          "pt-BR",
        ),
    );
  const peakFlexibleContributor = snapshot.peakContributors.find(
    (contributor) => {
      const device = snapshot.distribution.find(
        (item) => item.deviceId === contributor.deviceId,
      );

      return device ? !isEssentialDevice(device) : false;
    },
  );

  return {
    snapshot,
    tariffBrlPerKwh,
    leader,
    reductionCandidate,
    eveningCandidate: eveningCandidates[0]?.device,
    eveningCandidateConsumptionKwh:
      eveningCandidates[0]?.eveningConsumptionKwh ?? 0,
    peakFlexibleContributor,
    peakToAverageRatio:
      snapshot.metrics.averageConsumptionKwh > 0
        ? snapshot.metrics.peakConsumptionKwh /
          snapshot.metrics.averageConsumptionKwh
        : 0,
    highConsumptionDeviceCount: snapshot.distribution.filter(
      (device) =>
        device.consumptionKwh >=
        ENERGY_ADVISOR_LIMITS.highConsumptionKwh,
    ).length,
    suspiciousDevices: findSuspiciousDevices(snapshot),
  };
}

function buildConcentrationRecommendation(
  context: EnergyAdvisorContext,
): EnergyRecommendation | undefined {
  const { leader, snapshot } = context;

  if (
    !leader ||
    leader.percentage <=
      ENERGY_ADVISOR_LIMITS.excessiveConcentrationPercentage
  ) {
    return undefined;
  }

  const isOnlyDevice = snapshot.distribution.length === 1;
  const essential = isEssentialDevice(leader);
  const displayName = formatDeviceDisplayName(leader.name);
  const explanation = isOnlyDevice
    ? `${displayName} representa 100% porque é o único dispositivo ativo.`
    : `${displayName} responde por ${formatAnalysisNumber(
        leader.percentage,
      )}% do consumo estimado.`;
  const nextStep = essential
    ? "Como é um equipamento essencial, revise a eficiência percebida e confirme o cadastro, sem interromper seu uso necessário."
    : "Confirme se a potência e as horas cadastradas representam o uso real antes de ajustar a rotina.";

  return {
    id: `concentration-${leader.deviceId}`,
    type: "high_concentration",
    priority:
      leader.percentage >=
      ENERGY_ADVISOR_LIMITS.severeConcentrationPercentage
        ? "high"
        : "medium",
    title: `Consumo concentrado em ${displayName}`,
    description: `${explanation} ${nextStep}`,
    deviceId: leader.deviceId,
    deviceName: displayName,
    impact: zeroImpact(),
    action: {
      label: essential
        ? "Revisar eficiência e dados cadastrados"
        : "Revisar potência e horas cadastradas",
    },
    evidence: {
      currentConsumptionKwh: leader.consumptionKwh,
      currentPercentage: leader.percentage,
    },
    savingsStrategy: "none",
    relevance: 88,
  };
}

function buildPeakRecommendation(
  context: EnergyAdvisorContext,
): EnergyRecommendation | undefined {
  const { snapshot, peakFlexibleContributor } = context;

  if (
    context.peakToAverageRatio <
      ENERGY_ADVISOR_LIMITS.relevantPeakRatio ||
    !snapshot.metrics.peakHour ||
    snapshot.peakContributors.length === 0
  ) {
    return undefined;
  }

  const contributors = snapshot.peakContributors
    .map((contributor) =>
      formatDeviceDisplayName(contributor.name),
    )
    .join(" e ");
  const contributionPercentage = snapshot.peakContributors.reduce(
    (total, contributor) =>
      total + contributor.percentageOfPeak,
    0,
  );
  const movableContribution =
    peakFlexibleContributor?.consumptionKwh ?? 0;

  return {
    id: `peak-${snapshot.metrics.peakHour}`,
    type: "peak_reduction",
    priority:
      context.peakToAverageRatio >=
      ENERGY_ADVISOR_LIMITS.highPeakRatio
        ? "high"
        : "medium",
    title: `Reduza a simultaneidade no pico das ${snapshot.metrics.peakHour}`,
    description: `${contributors} responderam por ${formatAnalysisNumber(
      contributionPercentage,
    )}% do intervalo. ${
      peakFlexibleContributor
        ? `Mover ${formatDeviceDisplayName(peakFlexibleContributor.name)} poderia reduzir esse pico em cerca de ${formatAnalysisNumber(
            movableContribution,
          )} kWh.`
        : "Os principais contribuintes são essenciais; confirme a configuração antes de mudar a rotina."
    }`,
    deviceId: peakFlexibleContributor?.deviceId,
    deviceName: peakFlexibleContributor
      ? formatDeviceDisplayName(peakFlexibleContributor.name)
      : undefined,
    impact: zeroImpact(),
    action: {
      label: peakFlexibleContributor
        ? `Evitar usar ${formatDeviceDisplayName(peakFlexibleContributor.name)} junto aos demais aparelhos do pico`
        : "Revisar os horários dos aparelhos do pico",
    },
    evidence: {
      peakHour: snapshot.metrics.peakHour,
      peakToAverageRatio: context.peakToAverageRatio,
      estimatedPeakReductionKwh: movableContribution,
    },
    savingsStrategy: "alternative",
    relevance: 85,
  };
}

function buildBalancedRecommendation(): EnergyRecommendation {
  return {
    id: "balanced-usage",
    type: "balanced_usage",
    priority: "low",
    title: "Mantenha a distribuição atual",
    description:
      "As regras demonstrativas não identificaram concentração, pico ou configuração que exija atenção agora.",
    impact: zeroImpact(),
    action: {
      label: "Continuar acompanhando as estimativas",
    },
    evidence: {},
    savingsStrategy: "none",
    relevance: 40,
  };
}

function buildEmptyRecommendation(): EnergyRecommendation {
  return {
    id: "activate-devices",
    type: "configuration_review",
    priority: "low",
    title: "Ative um dispositivo para iniciar a análise",
    description:
      "Sem dispositivos ativos ou consumo estimado, ainda não há base para calcular economia ou padrões de uso.",
    impact: zeroImpact(),
    action: {
      label: "Revisar os dispositivos cadastrados",
    },
    evidence: {},
    savingsStrategy: "none",
    relevance: 50,
  };
}

export function buildContextualRecommendations(
  context: EnergyAdvisorContext,
): readonly EnergyRecommendation[] {
  return [
    buildConcentrationRecommendation(context),
    buildPeakRecommendation(context),
  ].filter(
    (recommendation): recommendation is EnergyRecommendation =>
      recommendation !== undefined,
  );
}

export function buildEnergyRecommendations(
  context: EnergyAdvisorContext,
  opportunities: readonly DeviceSavingOpportunity[],
): readonly EnergyRecommendation[] {
  if (
    context.snapshot.activeDeviceCount === 0 ||
    context.snapshot.totalConsumptionKwh === 0
  ) {
    return [buildEmptyRecommendation()];
  }

  const opportunityRecommendations =
    buildOpportunityRecommendations(opportunities);

  if (opportunityRecommendations.length > 0) {
    return opportunityRecommendations;
  }

  const contextualRecommendations =
    buildContextualRecommendations(context);

  return contextualRecommendations.length > 0
    ? contextualRecommendations
    : [buildBalancedRecommendation()];
}

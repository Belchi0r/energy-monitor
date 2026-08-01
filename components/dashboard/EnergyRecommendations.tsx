import {
  CalendarClock,
  CircleGauge,
  ClipboardCheck,
  Coins,
  Lightbulb,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import {
  formatDecimal,
  formatEnergy,
  formatMetricNumber,
} from "@/lib/dashboard/formatters";
import type {
  DeviceSavingEligibility,
  DeviceSavingOpportunity,
  EnergyRecommendation,
  EnergyRecommendationPriority,
  EnergyRecommendationType,
} from "@/lib/energy/advisor/energy-advisor.types";

const recommendationIcons: Record<
  EnergyRecommendationType,
  LucideIcon
> = {
  reduce_usage: Coins,
  shift_schedule: CalendarClock,
  high_concentration: CircleGauge,
  peak_reduction: Zap,
  standby: Lightbulb,
  configuration_review: ClipboardCheck,
  balanced_usage: Lightbulb,
};

const priorityLabels: Record<
  EnergyRecommendationPriority,
  { label: string; className: string }
> = {
  high: {
    label: "Impacto alto",
    className: "bg-rose-50 text-rose-700 ring-rose-600/15",
  },
  medium: {
    label: "Impacto médio",
    className: "bg-amber-50 text-amber-700 ring-amber-600/15",
  },
  low: {
    label: "Impacto leve",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
};

const eligibilityLabels: Record<DeviceSavingEligibility, string> = {
  eligible: "Oportunidade adicional",
  essential: "Uso essencial",
  insufficient_usage: "Uso insuficiente",
  zero_consumption: "Sem consumo calculável",
  invalid_configuration: "Cadastro para detalhar",
  not_recommended: "Rotina já adequada",
};

function getEvidenceLabel(recommendation: EnergyRecommendation) {
  if (recommendation.evidence.eligibilityReason) {
    return recommendation.evidence.eligibilityReason;
  }

  if (recommendation.evidence.currentPercentage !== undefined) {
    return `${formatDecimal(recommendation.evidence.currentPercentage)}% do consumo atual`;
  }

  if (recommendation.evidence.eveningPercentage !== undefined) {
    return `${formatDecimal(recommendation.evidence.eveningPercentage)}% após as 18h`;
  }

  if (recommendation.evidence.peakHour) {
    return `Pico às ${recommendation.evidence.peakHour}`;
  }

  if (recommendation.evidence.configurationReasons?.[0]) {
    return recommendation.evidence.configurationReasons[0];
  }

  return "Baseada no perfil atual de consumo";
}

export function getRecommendationGridClassName(
  recommendationCount: number,
) {
  if (recommendationCount === 1) {
    return "mx-auto max-w-5xl grid-cols-1";
  }

  if (recommendationCount === 2) {
    return "md:grid-cols-2";
  }

  return "md:grid-cols-2 xl:grid-cols-3";
}

type EnergyRecommendationsProps = {
  recommendations: readonly EnergyRecommendation[];
  opportunities: readonly DeviceSavingOpportunity[];
};

export function EnergyRecommendations({
  recommendations,
  opportunities,
}: EnergyRecommendationsProps) {
  const recommendedDeviceIds = new Set(
    recommendations.flatMap((recommendation) =>
      recommendation.deviceId ? [recommendation.deviceId] : [],
    ),
  );
  const otherOpportunities = opportunities.filter(
    (opportunity) =>
      !recommendedDeviceIds.has(opportunity.deviceId),
  );

  return (
    <div id="energy-recommendations" className="scroll-mt-20">
      <Panel
        title="Recomendações de economia"
        description="Ações priorizadas a partir do cadastro atual; nenhuma automação foi executada"
        className="bg-slate-50/50"
      >
        <ol
          className={`grid min-w-0 gap-3 ${getRecommendationGridClassName(recommendations.length)}`}
        >
          {recommendations.map((recommendation) => {
            const Icon = recommendationIcons[recommendation.type];
            const priority = priorityLabels[recommendation.priority];
            const monthlyCurrency = formatMetricNumber(
              recommendation.impact.monthlyBrl,
              "currency",
            ).value;
            const hasFinancialImpact =
              recommendation.impact.monthlyBrl > 0;

            return (
              <li
                key={recommendation.id}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Icon aria-hidden="true" className="size-4.5" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${priority.className}`}
                  >
                    {priority.label}
                  </span>
                </div>

                <div className="mt-3 min-w-0">
                  <h3 className="text-base font-semibold leading-5 text-slate-950">
                    {recommendation.title}
                  </h3>
                  {recommendation.deviceName ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {recommendation.deviceName}
                    </p>
                  ) : null}
                </div>

                {hasFinancialImpact ? (
                  <div className="mt-3 rounded-xl bg-emerald-50/70 px-3 py-2.5 ring-1 ring-inset ring-emerald-200/60">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-emerald-800">
                      Economia calculada
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-slate-950">
                      {monthlyCurrency}
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        /mês
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                      {formatEnergy(recommendation.impact.monthlyKwh)} por
                      mês
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200">
                    <p className="text-xs font-semibold text-slate-700">
                      Ação informativa, sem economia financeira calculada.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs font-medium leading-4 text-slate-500">
                  Evidência: {getEvidenceLabel(recommendation)}
                </p>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {recommendation.description}
                </p>

                {recommendation.action ? (
                  <div className="mt-auto border-t border-slate-200/80 pt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Ação sugerida
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-800">
                      {recommendation.action.label}
                    </p>
                    {recommendation.action
                      .suggestedPercentageReduction !== undefined ? (
                      <p className="mt-1 text-xs leading-4 text-slate-500">
                        Aproximadamente{" "}
                        {formatDecimal(
                          recommendation.action
                            .suggestedPercentageReduction,
                        )}
                        % do uso diário cadastrado.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        {otherOpportunities.length > 0 ? (
          <details className="mt-4 rounded-2xl border border-slate-200/80 bg-white">
            <summary className="min-h-11 cursor-pointer rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 marker:text-emerald-700">
              Análise dos demais dispositivos
              <span className="ml-2 text-xs font-medium text-slate-500">
                {otherOpportunities.length} avaliados
              </span>
            </summary>
            <ul
              aria-label="Dispositivos avaliados sem recomendação principal"
              className="divide-y divide-slate-200/80 border-t border-slate-200/80 px-4"
            >
              {otherOpportunities.map((opportunity) => (
                <li
                  key={opportunity.id}
                  className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(9rem,0.35fr)_minmax(0,0.65fr)] sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {opportunity.deviceName}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-emerald-700">
                      {eligibilityLabels[opportunity.eligibility]}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-slate-600">
                    {opportunity.evidence.reason}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Estimativas usam a tarifa configurada neste navegador.
          Recomendações de horário reduzem concentração de pico, não
          necessariamente o custo total.
        </p>
      </Panel>
    </div>
  );
}

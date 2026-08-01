import {
  ArrowDown,
  ArrowRight,
  Gauge,
  Leaf,
  Lightbulb,
  PiggyBank,
} from "lucide-react";

import {
  formatDecimal,
  formatMetricNumber,
} from "@/lib/dashboard/formatters";
import { ENERGY_STATUS_DISPLAY_LABELS } from "@/lib/energy/advisor/energy-advisor.constants";
import type {
  EnergyAnalysis,
  EnergyEfficiencyStatus,
  EnergyRecommendation,
} from "@/lib/energy/advisor/energy-advisor.types";

const statusStyles: Record<
  EnergyEfficiencyStatus,
  { badge: string; meter: string }
> = {
  efficient: {
    badge: "bg-emerald-100 text-emerald-800",
    meter: "bg-emerald-500",
  },
  balanced: {
    badge: "bg-teal-100 text-teal-800",
    meter: "bg-teal-500",
  },
  attention: {
    badge: "bg-amber-100 text-amber-800",
    meter: "bg-amber-500",
  },
  critical: {
    badge: "bg-rose-100 text-rose-800",
    meter: "bg-rose-500",
  },
};

function getRecommendationEvidence(
  recommendation: EnergyRecommendation,
) {
  if (recommendation.evidence.currentPercentage !== undefined) {
    return `${formatDecimal(recommendation.evidence.currentPercentage)}% do consumo atual`;
  }

  if (recommendation.evidence.eveningPercentage !== undefined) {
    return `${formatDecimal(recommendation.evidence.eveningPercentage)}% ocorre após as 18h`;
  }

  if (recommendation.evidence.peakHour) {
    return `Pico identificado às ${recommendation.evidence.peakHour}`;
  }

  return "Recomendação baseada nos dados atuais do cadastro";
}

type SmartEnergySummaryProps = {
  analysis: EnergyAnalysis;
};

export function SmartEnergySummary({
  analysis,
}: SmartEnergySummaryProps) {
  const status = statusStyles[analysis.summary.status];
  const recommendation = analysis.recommendations[0];
  const hasFinancialPotential =
    analysis.financialOpportunityCount > 0;
  const hasCombinedPotential =
    analysis.financialOpportunityCount > 1;
  const displayedSavings = hasCombinedPotential
    ? analysis.combinedSavingsPotential
    : analysis.primaryRecommendationSavings;
  const monthlySavings = formatMetricNumber(
    displayedSavings.monthlyBrl,
    "currency",
  ).value;
  const annualSavings = formatMetricNumber(
    displayedSavings.annualBrl,
    "currency",
  ).value;
  const recommendationSavings =
    recommendation && recommendation.impact.monthlyBrl > 0
    ? formatMetricNumber(recommendation.impact.monthlyBrl, "currency")
        .value
    : undefined;
  const monthlyCo2 =
    analysis.environmentalImpact?.monthlyCo2KgAvoided ?? 0;

  return (
    <section
      aria-labelledby="smart-summary-title"
      className="dashboard-card-enter min-w-0 overflow-hidden rounded-3xl border border-emerald-200/80 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#f0fdfa_100%)] shadow-[var(--shadow-panel)]"
    >
      <div className="grid min-w-0 gap-0 lg:grid-cols-12">
        <div className="min-w-0 border-b border-emerald-200/70 p-5 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              <Gauge aria-hidden="true" className="size-4" />
              Eficiência
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}
            >
              {ENERGY_STATUS_DISPLAY_LABELS[analysis.summary.status]}
            </span>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <strong className="text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3.5rem]">
              {analysis.summary.score}
            </strong>
            <span className="pb-1.5 text-sm font-semibold text-slate-500">
              / 100
            </span>
          </div>

          <div
            role="meter"
            aria-label={`Índice de eficiência: ${analysis.summary.score} de 100`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={analysis.summary.score}
            className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-950/10"
          >
            <div
              className={`score-meter-enter h-full rounded-full ${status.meter}`}
              style={{ width: `${analysis.summary.score}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-4 text-slate-500">
            Índice demonstrativo, sem valor de certificação.
          </p>
        </div>

        <div className="min-w-0 border-b border-emerald-200/70 p-5 sm:p-6 lg:col-span-5 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Resumo inteligente
          </p>
          <h2
            id="smart-summary-title"
            className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950"
          >
            {analysis.summary.title}
          </h2>
          <p className="mt-1.5 text-sm leading-5 text-slate-600">
            {analysis.summary.description}
          </p>

          {recommendation ? (
            <div className="mt-4 min-w-0 rounded-2xl border border-emerald-200/80 bg-white/85 p-3.5 shadow-sm">
              <div className="flex min-w-0 gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Lightbulb aria-hidden="true" className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Principal oportunidade
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-5 text-slate-950">
                    {recommendation.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-4 text-slate-500">
                    {recommendation.deviceName ? (
                      <span className="font-semibold text-emerald-700">
                        {recommendation.deviceName}
                      </span>
                    ) : null}
                    <span>{getRecommendationEvidence(recommendation)}</span>
                  </div>
                  {recommendationSavings ? (
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      Economia desta ação:{" "}
                      <strong className="font-semibold text-emerald-800">
                        {recommendationSavings}/mês
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <a
            href="#energy-recommendations"
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-emerald-800 transition-colors duration-200 hover:text-emerald-950 motion-reduce:transition-none"
          >
            Ver recomendações
            <ArrowDown aria-hidden="true" className="size-4" />
            <span className="sr-only">
              calculadas a partir dos dispositivos cadastrados
            </span>
          </a>
        </div>

        <div className="min-w-0 p-5 sm:p-6 lg:col-span-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <PiggyBank aria-hidden="true" className="size-4 text-emerald-700" />
            {hasCombinedPotential
              ? "Potencial combinado"
              : hasFinancialPotential
                ? "Economia da principal ação"
                : "Economia calculada"}
          </span>
          <p className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
            {monthlySavings}
            <span className="ml-1 text-xs font-medium text-slate-500">
              /mês
            </span>
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums text-slate-600">
            {annualSavings} por ano
          </p>
          <p className="mt-2 text-xs leading-4 text-slate-500">
            {hasCombinedPotential
              ? `Até esse valor considerando ${analysis.financialOpportunityCount} ações independentes, sem dupla contagem.`
              : hasFinancialPotential
                ? "Valor calculado para uma única ação financeira."
                : "Nenhuma ação financeira elegível foi identificada."}
          </p>

          <div className="mt-4 border-t border-emerald-200/70 pt-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Leaf aria-hidden="true" className="size-4 text-emerald-700" />
              Impacto ambiental estimado
            </span>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-slate-900">
              {formatMetricNumber(monthlyCo2, "energy").value}
              <span className="ml-1 text-xs font-medium text-slate-500">
                kg CO₂/mês
              </span>
            </p>
            {analysis.environmentalImpact ? (
              <p className="mt-1 text-[0.68rem] leading-4 text-slate-500">
                {analysis.environmentalImpact.sourceLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-emerald-200/70 bg-white/60 px-5 py-2.5 text-xs text-slate-600 sm:px-6">
        {analysis.summary.reasons.slice(0, 3).map((reason) => (
          <span key={reason.id} className="inline-flex min-w-0 gap-1.5">
            <ArrowRight
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
            />
            <span>
              <strong className="font-semibold text-slate-800">
                {reason.label}
                {reason.scoreImpact < 0
                  ? ` (${reason.scoreImpact} pts)`
                  : ""}
                :
              </strong>{" "}
              {reason.description}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

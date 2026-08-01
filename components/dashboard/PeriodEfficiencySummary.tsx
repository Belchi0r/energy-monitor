import {
  ArrowRight,
  BadgeInfo,
  Gauge,
} from "lucide-react";

import type { PeriodEnergyAnalysis } from "@/lib/dashboard/period-efficiency";
import { ENERGY_STATUS_DISPLAY_LABELS } from "@/lib/energy/advisor/energy-advisor.constants";
import type { EnergyEfficiencyStatus } from "@/lib/energy/advisor/energy-advisor.types";

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

type PeriodEfficiencySummaryProps = {
  analysis: PeriodEnergyAnalysis;
};

export function getPeriodEfficiencyLabel(
  period: PeriodEnergyAnalysis["period"],
) {
  return period === "7d"
    ? "Eficiência dos últimos 7 dias"
    : "Eficiência dos últimos 30 dias";
}

export function getPeriodEfficiencyAriaLabel(
  analysis: PeriodEnergyAnalysis,
) {
  return `${getPeriodEfficiencyLabel(analysis.period)}: ${analysis.summary.score} de 100`;
}

export function PeriodEfficiencySummary({
  analysis,
}: PeriodEfficiencySummaryProps) {
  const { summary } = analysis;
  const styles = statusStyles[summary.status];
  const periodLabel = getPeriodEfficiencyLabel(analysis.period);

  return (
    <section
      aria-labelledby="period-efficiency-title"
      className="dashboard-card-enter min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_55%,#f0fdfa_100%)] shadow-[var(--shadow-panel)]"
    >
      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(13rem,0.32fr)_minmax(0,0.68fr)]">
        <div className="border-b border-slate-200/80 p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              <Gauge aria-hidden="true" className="size-4" />
              {periodLabel}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}
            >
              {ENERGY_STATUS_DISPLAY_LABELS[summary.status]}
            </span>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <strong className="text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3.5rem]">
              {summary.score}
            </strong>
            <span className="pb-1.5 text-sm font-semibold text-slate-500">
              / 100
            </span>
          </div>

          <div
            role="meter"
            aria-label={getPeriodEfficiencyAriaLabel(analysis)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.score}
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/10"
          >
            <div
              className={`score-meter-enter h-full rounded-full ${styles.meter}`}
              style={{ width: `${summary.score}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-4 text-slate-500">
            Índice demonstrativo; as entradas históricas são simuladas.
          </p>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Leitura do período
          </p>
          <h2
            id="period-efficiency-title"
            className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950"
          >
            {summary.title}
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-600">
            {summary.description}
          </p>

          <ol
            aria-label="Principais justificativas do índice"
            className="mt-4 grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3"
          >
            {summary.reasons.slice(0, 3).map((reason) => (
              <li
                key={reason.id}
                className="flex min-w-0 gap-2.5 rounded-2xl border border-slate-200/80 bg-white/80 p-3"
              >
                <ArrowRight
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">
                    {reason.label}
                    <span className="ml-1 font-medium tabular-nums text-slate-500">
                      {reason.scoreImpact < 0
                        ? `${reason.scoreImpact} pts`
                        : "estável"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-4 text-slate-500">
                    {reason.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-3 inline-flex items-start gap-2 text-xs leading-4 text-slate-500">
            <BadgeInfo
              aria-hidden="true"
              className="mt-px size-3.5 shrink-0 text-emerald-700"
            />
            {analysis.sourceLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

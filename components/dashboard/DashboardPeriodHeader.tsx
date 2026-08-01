import { BadgeInfo } from "lucide-react";

import { DashboardPeriodControls } from "@/components/dashboard/DashboardPeriodControls";
import { formatMetricNumber } from "@/lib/dashboard/formatters";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type DashboardPeriodHeaderProps = {
  view: DashboardViewData;
};

export function DashboardPeriodHeader({
  view,
}: DashboardPeriodHeaderProps) {
  const isToday = view.period === "today";
  const consumptionMetric = view.metrics.find(
    (metric) => metric.id === "periodConsumption",
  );
  const consumption = consumptionMetric
    ? formatMetricNumber(
        consumptionMetric.value,
        consumptionMetric.format,
      )
    : undefined;
  const consumptionLabel = consumption
    ? `${consumption.value}${consumption.unit ? ` ${consumption.unit}` : ""}`
    : "sem consumo disponível";

  return (
    <section aria-labelledby="overview-title">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Monitoramento residencial
          </p>
          <h1
            id="overview-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          >
            {isToday
              ? "Resumo do consumo de hoje"
              : `Visão geral de ${view.definition.label.toLocaleLowerCase("pt-BR")}`}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {isToday
              ? `Sua residência possui consumo estimado de ${consumptionLabel}. A análise abaixo destaca eficiência, oportunidades e padrões de uso.`
              : "Explore padrões demonstrativos, comparações e eventos do período selecionado."}
          </p>
        </div>

        <aside
          aria-label="Origem dos dados"
          className="flex min-w-0 items-start gap-2.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-3.5 py-3"
        >
          <BadgeInfo
            aria-hidden="true"
            className="mt-0.5 size-4.5 shrink-0 text-emerald-700"
          />
          <p className="text-xs leading-5 text-emerald-900">
            <strong className="font-semibold">Origem dos dados:</strong>{" "}
            {view.deviceDataSource === "registered-estimate"
              ? `estimativas do cadastro persistente. Atividades${view.comparisonDataSource ? " e comparação" : ""} permanecem simuladas.`
              : "valores históricos simulados, sem monitoramento em tempo real."}
          </p>
        </aside>
      </div>

      <div className="mt-4 max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <DashboardPeriodControls
            period={view.period}
            compare={view.compare}
            comparisonLabel={view.definition.comparisonLabel}
          />
          <p className="flex min-h-10 shrink-0 items-center rounded-xl bg-slate-50 px-3.5 text-xs font-medium text-slate-500 xl:ml-auto">
            Exibindo{" "}
            <span className="ml-1 font-semibold text-slate-800">
              {view.currentLabel}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

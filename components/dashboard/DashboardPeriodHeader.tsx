import { BadgeInfo, FlaskConical, House } from "lucide-react";
import Link from "next/link";

import { DataModeSelector } from "@/components/dashboard/DataModeSelector";
import { DashboardPeriodControls } from "@/components/dashboard/DashboardPeriodControls";
import { buildDashboardUrl } from "@/components/utils/dashboard-period";
import { formatMetricNumber } from "@/lib/dashboard/formatters";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type DashboardPeriodHeaderProps = {
  view: DashboardViewData;
  experience?: "account" | "public-demo";
};

export function getDashboardHeaderDescription(
  view: Pick<DashboardViewData, "mode" | "period" | "emptyState">,
  consumptionLabel: string,
) {
  if (view.mode === "demo") {
    return "Explore padrões, comparações e eventos gerados exclusivamente com dados simulados.";
  }

  if (
    view.period === "today" &&
    view.emptyState?.kind === "no-devices"
  ) {
    return "Você ainda não cadastrou dispositivos nesta residência. Adicione um equipamento para gerar estimativas ou explore a demonstração.";
  }

  return view.period === "today"
    ? `Sua residência possui consumo estimado de ${consumptionLabel}. A análise abaixo destaca eficiência, oportunidades e padrões de uso.`
    : "Consulte a disponibilidade de medições reais para o período selecionado.";
}

export function DashboardPeriodHeader({
  view,
  experience = "account",
}: DashboardPeriodHeaderProps) {
  const isToday = view.period === "today";
  const isDemo = view.mode === "demo";
  const isPublicDemo = experience === "public-demo";
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
  const description = getDashboardHeaderDescription(
    view,
    consumptionLabel,
  );

  return (
    <section aria-labelledby="overview-title">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {isDemo ? "Demonstração" : "Minha residência"}
          </p>
          <h1
            id="overview-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          >
            {isDemo
              ? isToday
                ? "Resumo demonstrativo de hoje"
                : `Demonstração de ${view.definition.label.toLocaleLowerCase("pt-BR")}`
              : isToday
              ? "Resumo do consumo de hoje"
              : `Visão geral de ${view.definition.label.toLocaleLowerCase("pt-BR")}`}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
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
            {isDemo
              ? "datasets globais simulados, sem dispositivos cadastrados da sua residência."
              : "somente dispositivos vinculados à sua conta. Nenhum dataset demonstrativo é combinado com esta visão."}
          </p>
        </aside>
      </div>

      {isDemo && !isPublicDemo ? (
        <aside
          aria-label="Aviso do modo demonstração"
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <FlaskConical
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-amber-800"
            />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Modo demonstração
              </p>
              <p className="mt-0.5 text-sm leading-5 text-amber-900">
                Os dados exibidos são simulados e não representam sua residência.
              </p>
            </div>
          </div>
          <Link
            href={buildDashboardUrl(view.period, false, "home")}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-amber-950 transition-colors duration-200 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 motion-reduce:transition-none"
          >
            <House aria-hidden="true" className="size-4" />
            Voltar para minha residência
          </Link>
        </aside>
      ) : null}

      <div className="mt-4 max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[var(--shadow-panel)]">
        {!isPublicDemo ? (
          <div className="mb-2 sm:max-w-md">
            <DataModeSelector
              mode={view.mode}
              homeHref={buildDashboardUrl(view.period, false, "home")}
              demoHref={buildDashboardUrl(
                view.period,
                view.compare,
                "demo",
              )}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <DashboardPeriodControls
            period={view.period}
            compare={view.compare}
            comparisonLabel={view.definition.comparisonLabel}
            mode={view.mode}
            comparisonAvailable={view.comparisonAvailable}
            experience={experience}
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

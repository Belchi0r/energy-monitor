import { BadgeInfo } from "lucide-react";

import { DashboardPeriodControls } from "@/components/dashboard/DashboardPeriodControls";
import type { DashboardViewData } from "@/components/data/dashboard";

type DashboardPeriodHeaderProps = {
  view: DashboardViewData;
};

export function DashboardPeriodHeader({
  view,
}: DashboardPeriodHeaderProps) {
  return (
    <section aria-labelledby="overview-title">
      <p className="text-sm font-semibold text-emerald-700">
        Monitoramento residencial
      </p>
      <div className="mt-2">
        <div className="max-w-3xl">
          <h1
            id="overview-title"
            className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
          >
            Visão geral
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Compare períodos e transforme padrões de consumo simulados em
            informações úteis para análise.
          </p>
        </div>
      </div>

      <div className="mt-6 max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <DashboardPeriodControls
            period={view.period}
            compare={view.compare}
            comparisonLabel={view.definition.comparisonLabel}
          />
          <p className="flex min-h-11 shrink-0 items-center rounded-xl bg-slate-50 px-4 text-xs font-medium text-slate-500 xl:ml-auto">
            Em exibição:{" "}
            <span className="ml-1 font-semibold text-slate-800">
              {view.currentLabel}
            </span>
          </p>
        </div>
      </div>

      <aside
        aria-label="Aviso sobre os dados"
        className="mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4"
      >
        <BadgeInfo
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-emerald-700"
        />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Dados demonstrativos
          </p>
          <p className="mt-1 text-sm leading-5 text-emerald-800">
            Todos os valores e comparações são simulados; esta interface não
            representa monitoramento em tempo real.
          </p>
        </div>
      </aside>
    </section>
  );
}

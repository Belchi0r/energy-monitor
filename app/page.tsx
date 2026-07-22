import { BadgeInfo } from "lucide-react";

import { ConsumptionCharts } from "@/components/dashboard/ConsumptionCharts";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { dashboardData } from "@/components/data/dashboard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section aria-labelledby="overview-title">
            <p className="text-sm font-semibold text-emerald-700">
              Monitoramento residencial
            </p>
            <h1
              id="overview-title"
              className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
            >
              Visão geral
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Explore indicadores, padrões de consumo e atividades de
              dispositivos em um cenário preparado para demonstrar a interface.
            </p>

            <aside
              aria-label="Aviso sobre os dados"
              className="mt-5 flex max-w-3xl items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"
            >
              <BadgeInfo
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-emerald-700"
              />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Dados simulados
                </p>
                <p className="mt-1 text-sm leading-5 text-emerald-800">
                  Os valores desta página são demonstrativos e não representam
                  monitoramento em tempo real.
                </p>
              </div>
            </aside>
          </section>

          <div className="mt-8 space-y-6">
            <MetricsSection metrics={dashboardData.metrics} />
            <ConsumptionCharts
              energyUsage={dashboardData.energyUsage}
              deviceConsumption={dashboardData.deviceConsumption}
            />
            <RecentActivityTable
              activities={dashboardData.recentActivities}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

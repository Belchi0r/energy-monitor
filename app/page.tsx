import { redirect } from "next/navigation";

import { ConsumptionCharts } from "@/components/dashboard/ConsumptionCharts";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { IntelligenceSection } from "@/components/dashboard/IntelligenceSection";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { getDashboardViewData } from "@/components/data/dashboard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  buildDashboardUrl,
  parseDashboardSearchParams,
  type DashboardSearchParams,
} from "@/components/utils/dashboard-period";

type HomeProps = {
  searchParams: Promise<DashboardSearchParams>;
};

export default async function Home({ searchParams }: HomeProps) {
  const routeState = parseDashboardSearchParams(await searchParams);

  if (routeState.shouldRedirect) {
    redirect(buildDashboardUrl("today", routeState.compare));
  }

  const view = getDashboardViewData(
    routeState.period,
    routeState.compare,
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
          <DashboardPeriodHeader view={view} />

          <div className="mt-8 space-y-6">
            <MetricsSection
              metrics={view.metrics}
              transitionKey={view.transitionKey}
            />
            <ConsumptionCharts
              key={view.transitionKey}
              temporalAnalysis={view.temporalAnalysis}
              deviceAnalysis={view.deviceAnalysis}
              definition={view.definition}
              currentLabel={view.currentLabel}
              previousLabel={view.previousLabel}
            />
            <IntelligenceSection
              alerts={view.alerts}
              timeline={view.timeline}
            />
            <RecentActivityTable
              activities={view.activities}
              activityTimeLabel={view.definition.activityTimeLabel}
              periodLabel={view.definition.label}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

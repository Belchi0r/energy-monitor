import { redirect } from "next/navigation";

import { ConsumptionCharts } from "@/components/dashboard/ConsumptionCharts";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { EnergyRecommendations } from "@/components/dashboard/EnergyRecommendations";
import { IntelligenceSection } from "@/components/dashboard/IntelligenceSection";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { PeriodEfficiencySummary } from "@/components/dashboard/PeriodEfficiencySummary";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { SmartEnergySummary } from "@/components/dashboard/SmartEnergySummary";
import {
  getDashboardCanonicalRedirect,
  parseDashboardSearchParams,
  type DashboardSearchParams,
} from "@/components/utils/dashboard-period";
import { dashboardService } from "@/lib/dashboard/application";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import { requireUser } from "@/lib/supabase/require-user";

type HomeProps = {
  searchParams: Promise<DashboardSearchParams>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [resolvedSearchParams, tariffBrlPerKwh, user] =
    await Promise.all([
      searchParams,
      getEffectiveEnergyTariff(),
      requireUser(),
    ]);
  const routeState = parseDashboardSearchParams(
    resolvedSearchParams,
  );

  const canonicalRedirect = getDashboardCanonicalRedirect(routeState);

  if (canonicalRedirect) {
    redirect(canonicalRedirect);
  }

  const view = await dashboardService.getDashboard(
    {
      period: routeState.period,
      compare: routeState.compare,
      mode: routeState.mode,
    },
    user.id,
    tariffBrlPerKwh,
  );

  return (
    <>
      <DashboardPeriodHeader view={view} />

      <div className="mt-6 space-y-5">
        {view.emptyState ? <DashboardEmptyState view={view} /> : null}
        {view.emptyState?.kind === "historical-unavailable" ? null : (
          <>
            {view.energyAnalysis ? (
              <SmartEnergySummary analysis={view.energyAnalysis} />
            ) : view.periodEnergyAnalysis ? (
              <PeriodEfficiencySummary
                analysis={view.periodEnergyAnalysis}
              />
            ) : null}
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
              deviceDataSource={view.deviceDataSource}
            />
            {view.energyAnalysis ? (
              <EnergyRecommendations
                recommendations={view.energyAnalysis.recommendations}
                opportunities={view.energyAnalysis.opportunities}
              />
            ) : null}
            <IntelligenceSection
              alerts={view.alerts}
              timeline={view.timeline}
              dataOrigin={view.dataOrigin}
            />
            <RecentActivityTable
              activities={view.activities}
              activityTimeLabel={view.definition.activityTimeLabel}
              period={view.period}
              periodLabel={view.definition.label}
              dataOrigin={view.dataOrigin}
            />
          </>
        )}
      </div>
    </>
  );
}

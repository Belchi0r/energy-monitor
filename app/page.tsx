import { redirect } from "next/navigation";

import { ConsumptionCharts } from "@/components/dashboard/ConsumptionCharts";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { EnergyRecommendations } from "@/components/dashboard/EnergyRecommendations";
import { IntelligenceSection } from "@/components/dashboard/IntelligenceSection";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { PeriodEfficiencySummary } from "@/components/dashboard/PeriodEfficiencySummary";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { SmartEnergySummary } from "@/components/dashboard/SmartEnergySummary";
import {
  buildDashboardUrl,
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

  if (routeState.shouldRedirect) {
    redirect(buildDashboardUrl("today", routeState.compare));
  }

  const view = await dashboardService.getDashboard(
    {
      period: routeState.period,
      compare: routeState.compare,
    },
    user.id,
    tariffBrlPerKwh,
  );

  return (
    <>
      <DashboardPeriodHeader view={view} />

      <div className="mt-6 space-y-5">
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
        />
        <RecentActivityTable
          activities={view.activities}
          activityTimeLabel={view.definition.activityTimeLabel}
          period={view.period}
          periodLabel={view.definition.label}
        />
      </div>
    </>
  );
}

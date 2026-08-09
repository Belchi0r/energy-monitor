import { ConsumptionCharts } from "@/components/dashboard/ConsumptionCharts";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { EnergyRecommendations } from "@/components/dashboard/EnergyRecommendations";
import { IntelligenceSection } from "@/components/dashboard/IntelligenceSection";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { PeriodEfficiencySummary } from "@/components/dashboard/PeriodEfficiencySummary";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { SmartEnergySummary } from "@/components/dashboard/SmartEnergySummary";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type DashboardOverviewProps = {
  view: DashboardViewData;
  experience?: "account" | "public-demo";
};

export function DashboardOverview({
  view,
  experience = "account",
}: DashboardOverviewProps) {
  return (
    <>
      <DashboardPeriodHeader view={view} experience={experience} />

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

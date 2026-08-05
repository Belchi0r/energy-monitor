import { ChartInsights } from "@/components/dashboard/charts/ChartInsights";
import { HistoryActivityView } from "@/components/dashboard/HistoryActivityView";
import { HistoryPeriodNav } from "@/components/dashboard/HistoryPeriodNav";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { dashboardService } from "@/lib/dashboard/application";
import { isDashboardPeriod } from "@/lib/dashboard/periods";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import { requireUser } from "@/lib/supabase/require-user";

type HistoryPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    compare?: string | string[];
  }>;
};

function getSelectedPeriod(value: string | string[] | undefined) {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  return selectedValue && isDashboardPeriod(selectedValue)
    ? selectedValue
    : "30d";
}

function getComparisonState(value: string | string[] | undefined) {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  return selectedValue !== "0";
}

export default async function HistoryPage({
  searchParams,
}: HistoryPageProps) {
  const [resolvedSearchParams, tariffBrlPerKwh, user] =
    await Promise.all([
      searchParams,
      getEffectiveEnergyTariff(),
      requireUser(),
    ]);
  const period = getSelectedPeriod(resolvedSearchParams.period);
  const compare = getComparisonState(resolvedSearchParams.compare);
  const view = await dashboardService.getDashboard(
    {
      period,
      compare,
    },
    user.id,
    tariffBrlPerKwh,
  );

  return (
    <>
      <PageHeader
        eyebrow="Análise temporal"
        title="Histórico"
        description="Explore períodos diferentes para compreender tendências, picos e mudanças no consumo residencial."
        demoDescription="Os registros históricos e comparações são simulados. Alterações no cadastro atual não criam medições retroativas."
        showBackLink
      />

      <div className="mt-8 space-y-6">
        <Panel
          title="Análise por período"
          description={
            compare
              ? `Exibindo ${view.currentLabel.toLocaleLowerCase("pt-BR")} em comparação com ${view.definition.comparisonLabel}`
              : `Exibindo somente ${view.currentLabel.toLocaleLowerCase("pt-BR")}`
          }
          className="min-w-0"
        >
          <HistoryPeriodNav
            period={period}
            compare={compare}
            comparisonLabel={view.definition.comparisonLabel}
          />
          <div className="mt-5">
            <ChartInsights
              insights={view.temporalAnalysis.insights}
              label="Principais conclusões do período histórico"
            />
          </div>
        </Panel>

        <MetricsSection
          metrics={view.metrics}
          transitionKey={`history-${view.transitionKey}`}
        />

        <HistoryActivityView
          activities={view.activities}
          activityTimeLabel={view.definition.activityTimeLabel}
          period={view.period}
          periodLabel={view.definition.label}
        />
      </div>
    </>
  );
}

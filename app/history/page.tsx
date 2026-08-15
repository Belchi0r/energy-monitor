import { redirect } from "next/navigation";

import { ChartInsights } from "@/components/dashboard/charts/ChartInsights";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DataModeSelector } from "@/components/dashboard/DataModeSelector";
import { HistoryActivityView } from "@/components/dashboard/HistoryActivityView";
import { HistoryPeriodNav } from "@/components/dashboard/HistoryPeriodNav";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { buildDashboardUrl } from "@/components/utils/dashboard-period";
import {
  buildHistoryUrl,
  getHistoryCanonicalRedirect,
  parseHistorySearchParams,
  type HistorySearchParams,
} from "@/components/utils/history-route";
import { dashboardService } from "@/lib/dashboard/application";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import { requireUser } from "@/lib/supabase/require-user";

type HistoryPageProps = {
  searchParams: Promise<HistorySearchParams>;
};

export default async function HistoryPage({
  searchParams,
}: HistoryPageProps) {
  const [resolvedSearchParams, tariffBrlPerKwh, user] =
    await Promise.all([
      searchParams,
      getEffectiveEnergyTariff(),
      requireUser(),
    ]);
  const routeState = parseHistorySearchParams(resolvedSearchParams);
  const canonicalRedirect = getHistoryCanonicalRedirect(routeState);

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

  if (routeState.compare && !view.compare) {
    redirect(buildHistoryUrl(routeState.period, false, routeState.mode));
  }

  const isDemo = view.mode === "demo";
  const homeHref = buildHistoryUrl(view.period, false, "home");
  const demoHref = buildHistoryUrl(
    view.period,
    isDemo ? view.compare : true,
    "demo",
  );

  return (
    <>
      <PageHeader
        eyebrow="Análise temporal"
        title="Histórico"
        description={
          isDemo
            ? "Explore períodos diferentes para compreender tendências, picos e mudanças no cenário demonstrativo."
            : "Acompanhe o histórico estimado criado a partir dos dispositivos cadastrados na sua residência."
        }
        noticeTitle={isDemo ? "Modo demonstração" : "Minha residência"}
        demoDescription={
          isDemo
            ? "Os registros históricos e comparações são simulados. Alterações no cadastro atual não modificam cenários anteriores."
            : "Snapshots passados permanecem congelados; dias sem acesso continuam ausentes e não são tratados como zero."
        }
        action={
          <DataModeSelector
            mode={view.mode}
            homeHref={homeHref}
            demoHref={demoHref}
          />
        }
        showBackLink
        backHref={buildDashboardUrl("today", false, view.mode)}
      />

      <div className="mt-8 space-y-6">
        {view.emptyState ? (
          <DashboardEmptyState
            view={view}
            primaryHref={buildDashboardUrl("today", false, "home")}
            secondaryHref={demoHref}
          />
        ) : (
          <>
            <Panel
              title="Análise por período"
              description={
                view.compare
                  ? `Exibindo ${view.currentLabel.toLocaleLowerCase("pt-BR")} em comparação com ${view.definition.comparisonLabel}`
                  : `Exibindo somente ${view.currentLabel.toLocaleLowerCase("pt-BR")}`
              }
              className="min-w-0"
            >
              <HistoryPeriodNav
                period={view.period}
                compare={view.compare}
                comparisonLabel={view.definition.comparisonLabel}
                comparisonAvailable={view.comparisonAvailable}
                mode={view.mode}
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
              dataOrigin={view.dataOrigin}
            />
          </>
        )}
      </div>
    </>
  );
}

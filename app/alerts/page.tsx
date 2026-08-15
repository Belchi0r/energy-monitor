import {
  Bell,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AlertsView } from "@/components/dashboard/AlertsView";
import { DashboardEmptyStateCard } from "@/components/dashboard/DashboardEmptyState";
import { DataModeSelector } from "@/components/dashboard/DataModeSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import {
  buildDataModeUrl,
  parseDashboardDataMode,
  type DataModeSearchParams,
} from "@/components/utils/dashboard-mode";
import { buildDashboardUrl } from "@/components/utils/dashboard-period";
import { dashboardService } from "@/lib/dashboard/application";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import { requireUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

type AlertsPageProps = {
  searchParams: Promise<DataModeSearchParams>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const [resolvedSearchParams, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);
  const tariffBrlPerKwh = await getEffectiveEnergyTariff(user.id);
  const modeState = parseDashboardDataMode(resolvedSearchParams);

  if (modeState.shouldRedirect) {
    redirect(buildDataModeUrl("/alerts", modeState.mode));
  }

  const isDemo = modeState.mode === "demo";
  const view = await dashboardService.getDashboard(
    {
      period: isDemo ? "30d" : "today",
      compare: isDemo,
      mode: modeState.mode,
    },
    user.id,
    tariffBrlPerKwh,
  );
  const attentionCount = view.alerts.filter(
    (alert) =>
      alert.severity === "high" || alert.severity === "medium",
  ).length;
  const deviceAlertCount = view.alerts.filter(
    (alert) => alert.source === "device",
  ).length;
  const homeHref = buildDataModeUrl("/alerts", "home");
  const demoHref = buildDataModeUrl("/alerts", "demo");
  const hasNoDevices = view.emptyState?.kind === "no-devices";

  return (
    <>
      <PageHeader
        eyebrow="Inteligência de consumo"
        title="Alertas"
        description={
          isDemo
            ? "Explore alertas calculados para o cenário demonstrativo dos últimos 30 dias."
            : "Acompanhe oportunidades e concentrações estimadas com base nos dispositivos da sua residência."
        }
        noticeTitle={isDemo ? "Modo demonstração" : "Minha residência"}
        demoDescription={
          isDemo
            ? "Os alertas são calculados sobre dados simulados dos últimos 30 dias e não disparam notificações reais."
            : "Os alertas são estimativas baseadas no cadastro da sua conta e não representam medições em tempo real."
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
        {hasNoDevices ? (
          <DashboardEmptyStateCard
            kind="no-devices"
            title="Cadastre dispositivos para gerar alertas"
            description="O Energy Monitor analisará as estimativas dos equipamentos da sua residência para identificar oportunidades e concentrações de consumo."
            primaryHref="/devices?mode=home"
            primaryLabel="Adicionar dispositivo"
            secondaryHref={demoHref}
          />
        ) : (
          <>
            <section
              aria-label="Resumo dos alertas"
              className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <SummaryCard
                title="Alertas calculados"
                value={String(view.alerts.length)}
                description={
                  isDemo
                    ? "Regras acionadas no cenário simulado"
                    : "Estimativas calculadas com seu cadastro"
                }
                icon={Bell}
              />
              <SummaryCard
                title="Requerem atenção"
                value={String(attentionCount)}
                description={
                  isDemo
                    ? "Prioridades média e alta no cenário demonstrativo"
                    : "Prioridades média e alta nas estimativas residenciais"
                }
                icon={ShieldAlert}
              />
              <SummaryCard
                title="Relacionados a dispositivos"
                value={String(deviceAlertCount)}
                description="Alertas originados pela distribuição de consumo"
                icon={Radio}
              />
            </section>

            <AlertsView
              alerts={view.alerts}
              dataOrigin={view.dataOrigin}
            />
          </>
        )}
      </div>
    </>
  );
}

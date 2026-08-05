import {
  Bell,
  Radio,
  ShieldAlert,
} from "lucide-react";

import { AlertsView } from "@/components/dashboard/AlertsView";
import { PageHeader } from "@/components/layout/PageHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { dashboardService } from "@/lib/dashboard/application";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import { requireUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const [tariffBrlPerKwh, user] = await Promise.all([
    getEffectiveEnergyTariff(),
    requireUser(),
  ]);
  const view = await dashboardService.getDashboard(
    {
      period: "30d",
      compare: true,
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

  return (
    <>
      <PageHeader
        eyebrow="Inteligência de consumo"
        title="Alertas"
        description="Priorize mudanças relevantes e concentrações de consumo identificadas pelas regras da aplicação."
        demoDescription="Os alertas são calculados sobre dados simulados dos últimos 30 dias e não disparam notificações reais."
        showBackLink
      />

      <div className="mt-8 space-y-6">
        <section
          aria-label="Resumo dos alertas"
          className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <SummaryCard
            title="Alertas calculados"
            value={String(view.alerts.length)}
            description="Regras inteligentes acionadas no período"
            icon={Bell}
          />
          <SummaryCard
            title="Requerem atenção"
            value={String(attentionCount)}
            description="Prioridades média e alta no cenário demonstrativo"
            icon={ShieldAlert}
          />
          <SummaryCard
            title="Relacionados a dispositivos"
            value={String(deviceAlertCount)}
            description="Alertas originados pela distribuição de consumo"
            icon={Radio}
          />
        </section>

        <AlertsView alerts={view.alerts} />
      </div>
    </>
  );
}

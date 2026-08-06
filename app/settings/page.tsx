import { redirect } from "next/navigation";

import { SettingsPreferences } from "@/components/dashboard/SettingsPreferences";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  buildDataModeUrl,
  parseDashboardDataMode,
  type DataModeSearchParams,
} from "@/components/utils/dashboard-mode";
import { buildDashboardUrl } from "@/components/utils/dashboard-period";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";
import { requireUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<DataModeSearchParams>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const [resolvedSearchParams, tariffBrlPerKwh] = await Promise.all([
    searchParams,
    getEffectiveEnergyTariff(),
    requireUser(),
  ]);
  const modeState = parseDashboardDataMode(resolvedSearchParams);

  if (modeState.shouldRedirect) {
    redirect(buildDataModeUrl("/settings", modeState.mode));
  }

  return (
    <>
      <PageHeader
        eyebrow="Preferências da experiência"
        title="Configurações"
        description="Ajuste a tarifa e as preferências locais de visualização da dashboard."
        noticeTitle="Preferências locais"
        demoDescription="Estas configurações são salvas somente neste navegador. A tarifa é usada nas estimativas da sua conta; período e comparação controlam apenas a experiência de visualização."
        showBackLink
        backHref={buildDashboardUrl("today", false, modeState.mode)}
      />

      <div className="mt-8">
        <SettingsPreferences initialTariff={tariffBrlPerKwh} />
      </div>
    </>
  );
}

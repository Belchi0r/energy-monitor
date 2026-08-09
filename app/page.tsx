import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
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

  return <DashboardOverview view={view} />;
}

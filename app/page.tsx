import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import {
  buildDashboardUrl,
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
  const [resolvedSearchParams, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);
  const tariffBrlPerKwh = await getEffectiveEnergyTariff(user.id);
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

  if (routeState.compare && !view.compare) {
    redirect(
      buildDashboardUrl(routeState.period, false, routeState.mode),
    );
  }

  return <DashboardOverview view={view} />;
}

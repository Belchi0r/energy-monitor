import type {
  DashboardDataMode,
  DashboardPeriod,
} from "@/lib/dashboard/types";
import { parseDashboardDataMode } from "@/components/utils/dashboard-mode";
import {
  dashboardPeriodDefinitions,
  dashboardPeriods,
  getPeriodDefinition,
  isDashboardPeriod,
} from "@/lib/dashboard/periods";

export {
  dashboardPeriodDefinitions,
  dashboardPeriods,
  getPeriodDefinition,
  isDashboardPeriod,
};

export type DashboardSearchParams = {
  period?: string | string[];
  compare?: string | string[];
  mode?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDashboardSearchParams(params: DashboardSearchParams) {
  const periodValue = firstValue(params.period);
  const period =
    periodValue && isDashboardPeriod(periodValue) ? periodValue : "today";
  const modeState = parseDashboardDataMode({ mode: params.mode });
  const mode = modeState.mode;
  const comparisonRequested = firstValue(params.compare) === "true";
  const compare = comparisonRequested;

  return {
    period,
    compare,
    mode,
    shouldRedirect:
      (periodValue !== undefined && !isDashboardPeriod(periodValue)) ||
      modeState.shouldRedirect,
  };
}

export function buildDashboardUrl(
  period: DashboardPeriod,
  compare: boolean,
  mode: DashboardDataMode,
) {
  const searchParams = new URLSearchParams({ mode, period });

  if (compare) {
    searchParams.set("compare", "true");
  }

  return `/?${searchParams.toString()}`;
}

export function getDashboardCanonicalRedirect(
  routeState: ReturnType<typeof parseDashboardSearchParams>,
) {
  return routeState.shouldRedirect
    ? buildDashboardUrl(
        routeState.period,
        routeState.compare,
        routeState.mode,
      )
    : null;
}

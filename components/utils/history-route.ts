import { parseDashboardDataMode } from "@/components/utils/dashboard-mode";
import { isDashboardPeriod } from "@/lib/dashboard/periods";
import type {
  DashboardDataMode,
  DashboardPeriod,
} from "@/lib/dashboard/types";

export type HistorySearchParams = {
  mode?: string | string[];
  period?: string | string[];
  compare?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseHistorySearchParams(params: HistorySearchParams) {
  const modeState = parseDashboardDataMode({ mode: params.mode });
  const periodValue = firstValue(params.period);
  const resolvedPeriod =
    periodValue && isDashboardPeriod(periodValue) ? periodValue : "30d";
  const period =
    modeState.mode === "home" && resolvedPeriod === "today"
      ? "30d"
      : resolvedPeriod;
  const comparisonValue = firstValue(params.compare);
  const validComparison =
    comparisonValue === undefined ||
    comparisonValue === "0" ||
    comparisonValue === "1";
  const compare =
    modeState.mode === "demo"
      ? comparisonValue !== "0"
      : comparisonValue === "1";

  return {
    mode: modeState.mode,
    period,
    compare,
    shouldRedirect:
      modeState.shouldRedirect ||
      (periodValue !== undefined && !isDashboardPeriod(periodValue)) ||
      !validComparison ||
      (modeState.mode === "home" && comparisonValue === "0") ||
      (modeState.mode === "home" && resolvedPeriod === "today"),
  };
}

export function buildHistoryUrl(
  period: DashboardPeriod,
  compare: boolean,
  mode: DashboardDataMode,
) {
  const params = new URLSearchParams({ mode, period });

  if (mode === "demo" || compare) {
    params.set("compare", compare ? "1" : "0");
  }

  return `/history?${params.toString()}`;
}

export function getHistoryCanonicalRedirect(
  state: ReturnType<typeof parseHistorySearchParams>,
) {
  return state.shouldRedirect
    ? buildHistoryUrl(state.period, state.compare, state.mode)
    : null;
}

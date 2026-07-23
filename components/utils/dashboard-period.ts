import type { DashboardPeriod } from "@/lib/dashboard/types";
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
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDashboardSearchParams(params: DashboardSearchParams) {
  const periodValue = firstValue(params.period);
  const period =
    periodValue && isDashboardPeriod(periodValue) ? periodValue : "today";

  return {
    period,
    compare: firstValue(params.compare) === "true",
    shouldRedirect: periodValue !== undefined && !isDashboardPeriod(periodValue),
  };
}

export function buildDashboardUrl(
  period: DashboardPeriod,
  compare: boolean,
) {
  const searchParams = new URLSearchParams({ period });

  if (compare) {
    searchParams.set("compare", "true");
  }

  return `/?${searchParams.toString()}`;
}

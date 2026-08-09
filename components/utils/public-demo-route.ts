import {
  isDashboardPeriod,
} from "@/lib/dashboard/periods";
import type { DashboardPeriod } from "@/lib/dashboard/types";

export type PublicDemoSearchParams = {
  period?: string | string[];
  compare?: string | string[];
};

export function isPublicDemoPagePath(pathname: string) {
  return pathname === "/demo";
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolvePublicDemoPeriod(
  value: string | null | undefined,
): DashboardPeriod {
  return value && isDashboardPeriod(value) ? value : "today";
}

export function parsePublicDemoSearchParams(
  params: PublicDemoSearchParams,
) {
  const periodValue = firstValue(params.period);
  const compareValue = firstValue(params.compare);
  const period = resolvePublicDemoPeriod(periodValue);
  const compare = compareValue === "true";

  return {
    period,
    compare,
    shouldRedirect:
      (periodValue !== undefined && !isDashboardPeriod(periodValue)) ||
      (compareValue !== undefined && compareValue !== "true"),
  };
}

export function buildPublicDemoUrl(
  period: DashboardPeriod,
  compare: boolean,
) {
  const searchParams = new URLSearchParams({ period });

  if (compare) {
    searchParams.set("compare", "true");
  }

  return `/demo?${searchParams.toString()}`;
}

export function getPublicDemoCanonicalRedirect(
  state: ReturnType<typeof parsePublicDemoSearchParams>,
) {
  return state.shouldRedirect
    ? buildPublicDemoUrl(state.period, state.compare)
    : null;
}

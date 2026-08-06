import {
  isDashboardDataMode,
  type DashboardDataMode,
} from "@/lib/dashboard/types";

export type DataModeSearchParams = {
  mode?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveDashboardDataMode(
  value: string | null | undefined,
): DashboardDataMode {
  return value && isDashboardDataMode(value) ? value : "home";
}

export function parseDashboardDataMode(params: DataModeSearchParams) {
  const value = firstValue(params.mode);

  return {
    mode: resolveDashboardDataMode(value),
    shouldRedirect:
      value !== undefined && !isDashboardDataMode(value),
  };
}

export function buildDataModeUrl(
  pathname: string,
  mode: DashboardDataMode,
  values: Readonly<Record<string, string>> = {},
) {
  const searchParams = new URLSearchParams(values);

  searchParams.set("mode", mode);
  searchParams.sort();

  return `${pathname}?${searchParams.toString()}`;
}

export function buildModeAwareNavigationHref(
  href: string,
  mode: DashboardDataMode,
) {
  if (href === "/") {
    return buildDataModeUrl("/", mode, { period: "today" });
  }

  return buildDataModeUrl(href, mode);
}

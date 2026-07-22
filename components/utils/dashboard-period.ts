import type {
  DashboardPeriod,
  DashboardPeriodDefinition,
} from "@/components/types/dashboard";

export type DashboardSearchParams = {
  period?: string | string[];
  compare?: string | string[];
};

export const dashboardPeriods = ["today", "7d", "30d"] as const;

export const dashboardPeriodDefinitions = {
  today: {
    period: "today",
    currentDatasetId: "today",
    previousDatasetId: "yesterday",
    label: "Hoje",
    shortLabel: "Hoje",
    comparisonLabel: "ontem",
    chartTitle: "Consumo ao longo do dia",
    chartDescription: "Amostras simuladas em intervalos de duas horas",
    averageLabel: "Média por intervalo",
    pointNoun: "intervalo",
    activityTimeLabel: "Horário",
  },
  "7d": {
    period: "7d",
    currentDatasetId: "last7Days",
    previousDatasetId: "previous7Days",
    label: "Últimos 7 dias",
    shortLabel: "7 dias",
    comparisonLabel: "7 dias anteriores",
    chartTitle: "Consumo nos últimos 7 dias",
    chartDescription: "Totais diários simulados no período selecionado",
    averageLabel: "Média diária",
    pointNoun: "dia",
    activityTimeLabel: "Data",
  },
  "30d": {
    period: "30d",
    currentDatasetId: "last30Days",
    previousDatasetId: "previous30Days",
    label: "Últimos 30 dias",
    shortLabel: "30 dias",
    comparisonLabel: "30 dias anteriores",
    chartTitle: "Consumo nos últimos 30 dias",
    chartDescription: "Totais diários simulados no período selecionado",
    averageLabel: "Média diária",
    pointNoun: "dia",
    activityTimeLabel: "Data",
  },
} as const satisfies Record<DashboardPeriod, DashboardPeriodDefinition>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function isDashboardPeriod(value: string): value is DashboardPeriod {
  return dashboardPeriods.some((period) => period === value);
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

export function getPeriodDefinition(period: DashboardPeriod) {
  return dashboardPeriodDefinitions[period];
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

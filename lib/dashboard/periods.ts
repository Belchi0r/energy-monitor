import type {
  DashboardPeriod,
  DashboardPeriodDefinition,
} from "@/lib/dashboard/types";

export const dashboardPeriods = ["today", "7d", "30d"] as const;

export const dashboardPeriodDefinitions = {
  today: {
    period: "today",
    currentDatasetId: "today",
    previousDatasetId: "yesterday",
    label: "Hoje",
    shortLabel: "Hoje",
    comparisonLabel: "ontem (simulado)",
    chartTitle: "Consumo ao longo do dia",
    chartDescription:
      "Curva estimada dos dispositivos ativos em intervalos de duas horas",
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

export function isDashboardPeriod(value: string): value is DashboardPeriod {
  return dashboardPeriods.some((period) => period === value);
}

export function getPeriodDefinition(period: DashboardPeriod) {
  return dashboardPeriodDefinitions[period];
}

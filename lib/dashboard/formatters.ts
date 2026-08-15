import type {
  DashboardMetric,
  DashboardPeriod,
  MetricFormat,
} from "@/lib/dashboard/types";

const DASHBOARD_TIME_ZONE = "America/Sao_Paulo";

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const preciseDecimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const signedPreciseDecimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

const detailedPercentageFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const signedPercentageFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DASHBOARD_TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

const numericDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
});

const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

const monthDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

const accessibleDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

export type FormattedMetricValue = {
  value: string;
  unit?: string;
};

export type DashboardEventTimestamp = {
  timelineLabel: string;
  tableLabel: string;
  accessibleLabel: string;
};

function uppercaseFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

export function formatDashboardEventTimestamp(
  occurredAtIso: string,
  period: DashboardPeriod,
): DashboardEventTimestamp {
  const date = new Date(occurredAtIso);
  const timeLabel = timeFormatter.format(date);
  const weekdayDateLabel = `${uppercaseFirst(weekdayFormatter.format(date))}, ${numericDateFormatter.format(date)}`;
  const shortMonthDateLabel = `${dayFormatter.format(date)} ${shortMonthFormatter.format(date)}`;

  if (period === "today") {
    return {
      timelineLabel: timeLabel,
      tableLabel: `Hoje, ${timeLabel}`,
      accessibleLabel: accessibleDateFormatter.format(date),
    };
  }

  if (period === "7d") {
    return {
      timelineLabel: weekdayDateLabel,
      tableLabel: `${weekdayDateLabel}, ${timeLabel}`,
      accessibleLabel: accessibleDateFormatter.format(date),
    };
  }

  return {
    timelineLabel: monthDateFormatter.format(date),
    tableLabel: `${shortMonthDateLabel}, ${timeLabel}`,
    accessibleLabel: accessibleDateFormatter.format(date),
  };
}

export function formatDecimal(value: number) {
  return decimalFormatter.format(value);
}

export function formatDayCount(value: number) {
  return `${value} ${value === 1 ? "dia" : "dias"}`;
}

export function formatEnergy(value: number) {
  return `${formatDecimal(value)} kWh`;
}

export function formatChartEnergy(value: number) {
  return `${preciseDecimalFormatter.format(value)} kWh`;
}

export function formatSignedChartEnergy(value: number) {
  return `${signedPreciseDecimalFormatter.format(value)} kWh`;
}

export function formatPercentage(value: number, total: number) {
  return percentageFormatter.format(total === 0 ? 0 : value / total);
}

export function formatDetailedPercentage(value: number, total: number) {
  return detailedPercentageFormatter.format(total === 0 ? 0 : value / total);
}

export function formatRatioPercentage(ratio: number) {
  return percentageFormatter.format(Number.isFinite(ratio) ? ratio : 0);
}

export function formatSignedRatioPercentage(ratio: number | null) {
  return ratio === null
    ? "sem base"
    : signedPercentageFormatter.format(Number.isFinite(ratio) ? ratio : 0);
}

export function formatMetricNumber(
  value: number,
  format: MetricFormat,
): FormattedMetricValue {
  switch (format) {
    case "power":
      return { value: integerFormatter.format(value), unit: "W" };
    case "energy":
      return { value: formatDecimal(value), unit: "kWh" };
    case "currency":
      return { value: currencyFormatter.format(value) };
    case "integer":
      return { value: integerFormatter.format(value) };
  }
}

export function formatMetricValue(
  metric: DashboardMetric,
): FormattedMetricValue {
  return formatMetricNumber(metric.value, metric.format);
}

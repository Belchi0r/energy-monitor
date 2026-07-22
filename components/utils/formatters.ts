import type {
  DashboardMetric,
  MetricFormat,
} from "@/components/types/dashboard";

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

export type FormattedMetricValue = {
  value: string;
  unit?: string;
};

export function formatDecimal(value: number) {
  return decimalFormatter.format(value);
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

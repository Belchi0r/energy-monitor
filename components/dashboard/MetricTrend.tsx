import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type {
  MetricFormat,
  NumericComparison,
} from "@/components/types/dashboard";
import {
  formatMetricNumber,
  formatSignedRatioPercentage,
} from "@/components/utils/formatters";

type MetricTrendProps = {
  comparison: NumericComparison;
  format: MetricFormat;
};

export function MetricTrend({
  comparison,
  format,
}: MetricTrendProps) {
  const Icon =
    comparison.direction === "increase"
      ? ArrowUpRight
      : comparison.direction === "decrease"
        ? ArrowDownRight
        : Minus;
  const tone =
    comparison.significance === "relevant"
      ? "bg-amber-50 text-amber-800 ring-amber-600/15"
      : comparison.significance === "moderate"
        ? "bg-emerald-50 text-emerald-800 ring-emerald-600/15"
        : "bg-slate-100 text-slate-700 ring-slate-600/10";
  const previousValue = formatMetricNumber(
    comparison.previousValue,
    format,
  );
  const directionLabel =
    comparison.direction === "increase"
      ? "aumento"
      : comparison.direction === "decrease"
        ? "redução"
        : "sem alteração relevante";

  return (
    <p
      aria-label={comparison.message}
      className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold tabular-nums ring-1 ring-inset ${tone}`}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        {formatSignedRatioPercentage(comparison.percentageChange)}
      </span>
      <span>
        {directionLabel} · anterior: {previousValue.value}
        {previousValue.unit ? ` ${previousValue.unit}` : ""} (
        {comparison.previousLabel})
      </span>
    </p>
  );
}

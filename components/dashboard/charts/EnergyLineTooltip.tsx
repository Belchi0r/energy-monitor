import { motion, useReducedMotion } from "motion/react";
import type { TooltipContentProps } from "recharts";

import type { AnalyzedTemporalPoint } from "@/components/utils/dashboard-insights";
import {
  formatChartEnergy,
  formatDetailedPercentage,
  formatSignedChartEnergy,
  formatSignedRatioPercentage,
} from "@/components/utils/formatters";

type EnergyLineTooltipProps = TooltipContentProps & {
  points: readonly AnalyzedTemporalPoint[];
  totalKwh: number;
  currentLabel: string;
  previousLabel?: string;
};

export function EnergyLineTooltip({
  active,
  activeIndex,
  points,
  totalKwh,
  currentLabel,
  previousLabel,
}: EnergyLineTooltipProps) {
  const shouldReduceMotion = useReducedMotion();
  const numericIndex =
    activeIndex === undefined ? Number.NaN : Number(activeIndex);
  const point = Number.isInteger(numericIndex) ? points[numericIndex] : null;

  if (!active || !point) {
    return null;
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.18,
        ease: "easeOut",
      }}
      className="max-w-64 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-[var(--shadow-floating)] backdrop-blur-sm motion-reduce:transform-none motion-reduce:transition-none"
    >
      <p className="font-semibold text-slate-900">{point.currentLabel}</p>
      <dl className="mt-2 space-y-1.5 text-slate-600">
        <div className="flex items-center justify-between gap-4">
          <dt>{currentLabel}</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatChartEnergy(point.currentKwh)}
          </dd>
        </div>
        {previousLabel && point.previousKwh !== undefined ? (
          <div className="flex items-center justify-between gap-4">
            <dt>{previousLabel}</dt>
            <dd className="font-semibold tabular-nums text-slate-700">
              {formatChartEnergy(point.previousKwh)}
            </dd>
          </div>
        ) : null}
        {point.comparison ? (
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1.5">
            <dt>Variação</dt>
            <dd className="font-semibold tabular-nums text-slate-900">
              {formatSignedRatioPercentage(
                point.comparison.percentageChange,
              )}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt>Do período</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatDetailedPercentage(point.currentKwh, totalKwh)}
          </dd>
        </div>
        <div className="border-t border-slate-100 pt-1.5">
          <dt className="sr-only">Variação desde o ponto anterior</dt>
          <dd className="leading-4 text-slate-500">
            {point.deltaFromPreviousPointKwh === null
              ? "Primeiro ponto do período"
              : `${formatSignedChartEnergy(point.deltaFromPreviousPointKwh)} desde o ponto anterior`}
          </dd>
        </div>
      </dl>
    </motion.div>
  );
}

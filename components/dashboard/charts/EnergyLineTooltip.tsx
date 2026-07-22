import { motion, useReducedMotion } from "motion/react";
import type { TooltipContentProps } from "recharts";

import type { AnalyzedEnergyPoint } from "@/components/utils/dashboard-insights";
import {
  formatChartEnergy,
  formatDetailedPercentage,
  formatSignedChartEnergy,
} from "@/components/utils/formatters";

type EnergyLineTooltipProps = TooltipContentProps & {
  points: readonly AnalyzedEnergyPoint[];
  totalKwh: number;
};

export function EnergyLineTooltip({
  active,
  activeIndex,
  points,
  totalKwh,
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
      className="max-w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-[var(--shadow-floating)] backdrop-blur-sm motion-reduce:transform-none motion-reduce:transition-none"
    >
      <p className="font-semibold text-slate-900">Horário: {point.time}</p>
      <dl className="mt-2 space-y-1.5 text-slate-600">
        <div className="flex items-center justify-between gap-4">
          <dt>Consumo</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatChartEnergy(point.consumptionKwh)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Do total diário</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatDetailedPercentage(point.consumptionKwh, totalKwh)}
          </dd>
        </div>
        <div className="border-t border-slate-100 pt-1.5">
          <dt className="sr-only">Variação desde o intervalo anterior</dt>
          <dd className="leading-4 text-slate-500">
            {point.deltaFromPreviousKwh === null
              ? "Primeiro intervalo do dia"
              : `${formatSignedChartEnergy(point.deltaFromPreviousKwh)} desde o intervalo anterior`}
          </dd>
        </div>
      </dl>
    </motion.div>
  );
}

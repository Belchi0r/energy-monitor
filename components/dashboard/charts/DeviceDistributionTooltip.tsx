import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { AnalyzedDeviceConsumption } from "@/components/utils/dashboard-insights";
import {
  formatEnergy,
  formatPercentage,
  formatSignedRatioPercentage,
} from "@/components/utils/formatters";

type DeviceDistributionTooltipProps = {
  item: AnalyzedDeviceConsumption | null;
  totalKwh: number;
  totalDevices: number;
  previousLabel?: string;
};

export function DeviceDistributionTooltip({
  item,
  totalKwh,
  totalDevices,
  previousLabel,
}: DeviceDistributionTooltipProps) {
  const shouldReduceMotion = useReducedMotion();
  const displayName = item?.device.replaceAll("-", "‑");

  return (
    <AnimatePresence initial={false}>
      {item ? (
        <motion.div
          key={item.id}
          role="tooltip"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.18,
            ease: "easeOut",
          }}
          className="pointer-events-none absolute inset-x-2 top-2 z-10 mx-auto max-w-60 rounded-xl border border-slate-200/80 bg-white/95 p-3.5 text-xs shadow-[var(--shadow-floating)] backdrop-blur-sm motion-reduce:transform-none motion-reduce:transition-none"
        >
          <p className="text-sm font-semibold text-slate-900 [text-wrap:balance]">
            {displayName}
          </p>
          <dl className="mt-2 space-y-1.5 text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>Consumo</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatEnergy(item.consumptionKwh)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Participação</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatPercentage(item.consumptionKwh, totalKwh)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Ranking</dt>
              <dd className="font-semibold text-slate-900">
                {item.rank}º de {totalDevices}
              </dd>
            </div>
            {item.periodComparison ? (
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-1.5">
                <dt>vs. {previousLabel}</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {formatSignedRatioPercentage(
                    item.periodComparison.percentageChange,
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { AnalyzedDeviceConsumption } from "@/components/utils/dashboard-insights";
import {
  formatEnergy,
  formatPercentage,
} from "@/components/utils/formatters";

type DeviceDistributionTooltipProps = {
  item: AnalyzedDeviceConsumption | null;
  totalKwh: number;
  totalDevices: number;
};

export function DeviceDistributionTooltip({
  item,
  totalKwh,
  totalDevices,
}: DeviceDistributionTooltipProps) {
  const shouldReduceMotion = useReducedMotion();

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
          className="pointer-events-none absolute inset-x-2 top-2 z-10 mx-auto max-w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-[var(--shadow-floating)] backdrop-blur-sm motion-reduce:transform-none motion-reduce:transition-none"
        >
          <p className="font-semibold text-slate-900">{item.device}</p>
          <dl className="mt-1.5 space-y-1 text-slate-600">
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
          </dl>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { AnalyzedDeviceConsumption } from "@/lib/dashboard/analytics";
import {
  formatDecimal,
  formatPercentage,
  formatSignedRatioPercentage,
} from "@/lib/dashboard/formatters";

type DeviceChartCenterProps = {
  item: AnalyzedDeviceConsumption | null;
  totalKwh: number;
  currentLabel: string;
};

export function DeviceChartCenter({
  item,
  totalKwh,
  currentLabel,
}: DeviceChartCenterProps) {
  const shouldReduceMotion = useReducedMotion();
  const displayName = item?.device.replaceAll("-", "‑");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 pt-2"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={item?.id ?? "total"}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.18,
            ease: "easeOut",
          }}
          className="w-28 text-center sm:w-32"
        >
          {item ? (
            <>
              <p className="text-sm font-semibold leading-4 text-slate-800 [text-wrap:balance]">
                {displayName}
              </p>
              <p className="mt-1.5 whitespace-nowrap text-xl font-bold tracking-tight tabular-nums text-slate-950">
                {formatDecimal(item.consumptionKwh)}
                <span className="ml-1 text-xs font-medium text-slate-500">
                  kWh
                </span>
              </p>
              <p className="text-xs font-semibold tabular-nums text-emerald-700">
                {formatPercentage(item.consumptionKwh, totalKwh)} do total
              </p>
              {item.periodComparison ? (
                <p className="mt-1 text-[10px] font-semibold tabular-nums text-slate-600">
                  {formatSignedRatioPercentage(
                    item.periodComparison.percentageChange,
                  )}{" "}
                  no comparativo
                </p>
              ) : (
                <p className="mt-1 text-[10px] leading-3.5 text-slate-500">
                  {item.description}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-slate-950">
                {formatDecimal(totalKwh)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                kWh no total
              </p>
              <p className="mt-1 text-[10px] leading-3.5 text-slate-500">
                {currentLabel.toLocaleLowerCase("pt-BR")}
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

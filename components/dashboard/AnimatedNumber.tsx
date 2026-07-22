"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

import type { MetricFormat } from "@/components/types/dashboard";
import { formatMetricNumber } from "@/components/utils/formatters";

type AnimatedNumberProps = {
  value: number;
  format: MetricFormat;
  durationMs?: number;
};

export function AnimatedNumber({
  value,
  format,
  durationMs = 800,
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const animatedValue = useMotionValue(0);
  const visibleValue = useTransform(animatedValue, (latest) =>
    formatMetricNumber(latest, format).value,
  );
  const finalValue = formatMetricNumber(value, format);
  const finalText = finalValue.unit
    ? `${finalValue.value} ${finalValue.unit}`
    : finalValue.value;

  useEffect(() => {
    animatedValue.set(0);

    if (shouldReduceMotion) {
      animatedValue.set(value);
      return;
    }

    const controls = animate(animatedValue, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [animatedValue, durationMs, shouldReduceMotion, value]);

  return (
    <>
      <span
        aria-hidden="true"
        className="relative inline-grid min-w-0 tabular-nums"
      >
        <span className="invisible col-start-1 row-start-1">
          {finalValue.value}
        </span>
        <motion.span className="col-start-1 row-start-1">
          {visibleValue}
        </motion.span>
      </span>
      {finalValue.unit ? (
        <span
          aria-hidden="true"
          className="text-base font-medium text-slate-500"
        >
          {finalValue.unit}
        </span>
      ) : null}
      <span className="sr-only">{finalText}</span>
    </>
  );
}

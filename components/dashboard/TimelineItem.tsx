"use client";

import { motion, useReducedMotion } from "motion/react";

import {
  getTimelineStatusLabel,
  TimelineMarker,
} from "@/components/dashboard/TimelineMarker";
import type { DashboardTimelineItem as DashboardTimelineItemData } from "@/lib/dashboard/timeline";

type TimelineItemProps = {
  item: DashboardTimelineItemData;
  index: number;
  isLast: boolean;
};

export function TimelineItem({
  item,
  index,
  isLast,
}: TimelineItemProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.li
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.22,
        delay: shouldReduceMotion ? 0 : index * 0.04,
        ease: "easeOut",
      }}
      className="grid min-w-0 grid-cols-[3.75rem_1.75rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[5.5rem_1.75rem_minmax(0,1fr)] sm:gap-3"
    >
      <time
        dateTime={item.occurredAtIso}
        aria-label={item.fullTimeLabel}
        title={item.fullTimeLabel}
        className="pt-1 text-xs font-semibold leading-4 tabular-nums text-slate-500"
      >
        {item.timeLabel}
      </time>

      <TimelineMarker status={item.status} isLast={isLast} />

      <article className="min-w-0 pb-3.5">
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {item.event}
        </h3>
        <p className="mt-1 text-xs leading-4 text-slate-500">
          {item.device} · {getTimelineStatusLabel(item.status)}
        </p>
      </article>
    </motion.li>
  );
}

"use client";

import {
  CircleAlert,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { AlertBadge } from "@/components/dashboard/AlertBadge";
import type {
  AlertCategory,
  AlertSeverity,
  DashboardAlert,
} from "@/lib/dashboard/alert-types";

const severityConfig: Record<
  AlertSeverity,
  { icon: LucideIcon; className: string }
> = {
  info: {
    icon: Info,
    className: "bg-blue-50 text-blue-700 ring-blue-600/15",
  },
  low: {
    icon: CircleAlert,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
  medium: {
    icon: TriangleAlert,
    className: "bg-amber-50 text-amber-700 ring-amber-600/15",
  },
  high: {
    icon: OctagonAlert,
    className: "bg-rose-50 text-rose-700 ring-rose-600/15",
  },
};

const categoryLabels: Record<AlertCategory, string> = {
  peak: "Pico",
  device: "Dispositivo",
  comparison: "Comparação",
  distribution: "Distribuição",
  trend: "Tendência",
};

type AlertCardProps = {
  alert: DashboardAlert;
  index: number;
};

export function AlertCard({ alert, index }: AlertCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const titleId = `alert-title-${alert.id}`;

  return (
    <motion.li
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.22,
        delay: shouldReduceMotion ? 0 : index * 0.04,
        ease: "easeOut",
      }}
      className="min-w-0"
    >
      <article
        aria-labelledby={titleId}
        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
      >
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${config.className}`}
        >
          <Icon aria-hidden="true" className="size-5" />
          <span className="sr-only">
            Alerta de prioridade {alert.severity}
          </span>
        </span>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {categoryLabels[alert.category]}
          </p>
          <h3
            id={titleId}
            className="mt-1 text-sm font-semibold leading-5 text-slate-950"
          >
            {alert.title}
          </h3>
          <p className="mt-1.5 text-sm leading-5 text-slate-600">
            {alert.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AlertBadge severity={alert.severity} />
            <span className="text-xs font-medium text-slate-500">
              {alert.createdAt}
            </span>
          </div>
        </div>
      </article>
    </motion.li>
  );
}

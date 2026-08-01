"use client";

import {
  CheckCheck,
  CircleAlert,
  EyeOff,
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
  concentration: "Concentração",
  schedule: "Horário",
  configuration: "Configuração",
  efficiency: "Eficiência",
  savings: "Economia",
};

type AlertCardProps = {
  alert: DashboardAlert;
  index: number;
  state?: "open" | "resolved";
  onResolve?: (alert: DashboardAlert) => void;
  onDismiss?: (alert: DashboardAlert) => void;
  compact?: boolean;
};

export function AlertCard({
  alert,
  index,
  state = "open",
  onResolve,
  onDismiss,
  compact = false,
}: AlertCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const titleId = `alert-title-${alert.id}`;
  const isResolved = state === "resolved";
  const hasActions = Boolean(onResolve || onDismiss);

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
        aria-label={isResolved ? "Alerta resolvido" : undefined}
        className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] rounded-2xl border transition-[background-color,border-color,opacity] duration-200 motion-reduce:transition-none ${
          compact ? "gap-2.5 p-3" : "gap-3 p-4"
        } ${
          isResolved
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-slate-200/80 bg-slate-50/60"
        }`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${config.className} ${
            compact ? "size-9" : "size-10"
          }`}
        >
          <Icon
            aria-hidden="true"
            className={compact ? "size-4.5" : "size-5"}
          />
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
          <p
            className={`mt-1.5 leading-5 text-slate-600 ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {alert.description}
          </p>
          <div
            className={`flex flex-wrap items-center gap-2 ${
              compact ? "mt-2.5" : "mt-3"
            }`}
          >
            <AlertBadge severity={alert.severity} />
            {isResolved ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                <CheckCheck aria-hidden="true" className="size-3.5" />
                Resolvido nesta sessão
              </span>
            ) : null}
            <span className="text-xs font-medium text-slate-500">
              {alert.createdAt}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
              {alert.dataOrigin === "estimated"
                ? "Estimado"
                : "Simulado"}
            </span>
          </div>

          {hasActions ? (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/80 pt-4 sm:flex-row">
              <button
                type="button"
                disabled={isResolved}
                onClick={() => onResolve?.(alert)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 transition-colors duration-200 hover:bg-emerald-50 disabled:cursor-default disabled:border-emerald-100 disabled:bg-emerald-50/70 disabled:text-emerald-700 motion-reduce:transition-none"
              >
                <CheckCheck aria-hidden="true" className="size-4" />
                {isResolved ? "Resolvido" : "Marcar como resolvido"}
              </button>
              <button
                type="button"
                onClick={() => onDismiss?.(alert)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 motion-reduce:transition-none"
              >
                <EyeOff aria-hidden="true" className="size-4" />
                Dispensar
              </button>
            </div>
          ) : null}
        </div>
      </article>
    </motion.li>
  );
}

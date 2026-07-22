import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { MetricTrend } from "@/components/dashboard/MetricTrend";
import type {
  MetricFormat,
  NumericComparison,
} from "@/components/types/dashboard";

export type MetricCardProps = {
  title: string;
  value: number;
  format: MetricFormat;
  description: string;
  icon: LucideIcon;
  comparison?: NumericComparison;
  animationDelayMs?: number;
};

export function MetricCard({
  title,
  value,
  format,
  description,
  icon: Icon,
  comparison,
  animationDelayMs = 0,
}: MetricCardProps) {
  return (
    <article
      className="dashboard-card-enter group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-surface-raised p-5 shadow-[var(--shadow-panel)] transition-[border-color,box-shadow] duration-200 hover:border-emerald-200/90 hover:shadow-[var(--shadow-panel-hover)] motion-reduce:transition-none sm:p-6"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="flex min-h-10 items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-200 group-hover:bg-emerald-100 motion-reduce:transition-none">
          <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
        </span>
      </div>

      <p className="mt-6 flex items-baseline gap-1.5 whitespace-nowrap text-3xl font-semibold tracking-tight text-slate-950">
        <AnimatedNumber format={format} value={value} />
      </p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
        {description}
      </p>
      {comparison ? (
        <MetricTrend comparison={comparison} format={format} />
      ) : null}
    </article>
  );
}

import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import type { MetricFormat } from "@/components/types/dashboard";

export type MetricCardProps = {
  title: string;
  value: number;
  format: MetricFormat;
  description: string;
  icon: LucideIcon;
  animationDelayMs?: number;
};

export function MetricCard({
  title,
  value,
  format,
  description,
  icon: Icon,
  animationDelayMs = 0,
}: MetricCardProps) {
  return (
    <article
      className="dashboard-card-enter group rounded-2xl border border-border-subtle bg-surface-raised p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-emerald-200 hover:shadow-md motion-reduce:transition-none sm:p-6"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-200 group-hover:bg-emerald-100 motion-reduce:transition-none">
          <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
        </span>
      </div>

      <p className="mt-5 flex items-baseline gap-1.5 text-3xl font-semibold tracking-tight text-slate-950">
        <AnimatedNumber format={format} value={value} />
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </article>
  );
}

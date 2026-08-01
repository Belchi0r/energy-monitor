import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { MetricTrend } from "@/components/dashboard/MetricTrend";
import type {
  MetricFormat,
  NumericComparison,
} from "@/lib/dashboard/types";

export type MetricCardProps = {
  title: string;
  value: number;
  format: MetricFormat;
  description: string;
  icon: LucideIcon;
  comparison?: NumericComparison;
  animationDelayMs?: number;
  emphasis?: "featured" | "primary" | "secondary";
};

export function MetricCard({
  title,
  value,
  format,
  description,
  icon: Icon,
  comparison,
  animationDelayMs = 0,
  emphasis = "secondary",
}: MetricCardProps) {
  const isFeatured = emphasis === "featured";
  const isPrimary = emphasis !== "secondary";

  return (
    <article
      className={`dashboard-card-enter flex h-full min-w-0 flex-col rounded-2xl border p-4 ${
        isFeatured
          ? "border-emerald-200/90 bg-[linear-gradient(145deg,#ffffff_0%,#ecfdf5_100%)] shadow-[var(--shadow-panel)]"
          : isPrimary
            ? "border-slate-200/90 bg-white shadow-[var(--shadow-panel)]"
            : "border-slate-200/70 bg-slate-100/70 shadow-none"
      }`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-slate-600">
          {title}
        </p>
        <span
          className={`flex shrink-0 items-center justify-center rounded-xl text-brand ${
            isPrimary ? "size-9 bg-emerald-100/80" : "size-8 bg-white"
          }`}
        >
          <Icon
            aria-hidden="true"
            className={isPrimary ? "size-4.5" : "size-4"}
            strokeWidth={2}
          />
        </span>
      </div>

      <p
        className={`mt-4 flex min-w-0 items-baseline gap-1.5 whitespace-nowrap font-semibold tracking-tight tabular-nums text-slate-950 ${
          isFeatured
            ? "text-3xl sm:text-[2rem]"
            : isPrimary
              ? "text-2xl sm:text-3xl"
              : "text-2xl"
        }`}
      >
        <AnimatedNumber format={format} value={value} />
      </p>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">
        {description}
      </p>
      {comparison ? (
        <MetricTrend comparison={comparison} format={format} />
      ) : null}
    </article>
  );
}

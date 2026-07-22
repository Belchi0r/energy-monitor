import type { LucideIcon } from "lucide-react";

export type MetricCardProps = {
  title: string;
  value: string;
  unit?: string;
  description: string;
  icon: LucideIcon;
};

export function MetricCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
          <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
        </span>
      </div>

      <p className="mt-5 flex items-baseline gap-1.5 text-3xl font-semibold tracking-tight text-slate-950">
        <span>{value}</span>
        {unit ? (
          <span className="text-base font-medium text-slate-500">{unit}</span>
        ) : null}
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </article>
  );
}

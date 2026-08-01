import type { LucideIcon } from "lucide-react";

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <article className="dashboard-card-enter group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-panel)] transition-[border-color,box-shadow] duration-200 hover:border-emerald-200/90 hover:shadow-[var(--shadow-panel-hover)] motion-reduce:transition-none sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors duration-200 group-hover:bg-emerald-100 motion-reduce:transition-none">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-slate-500">{description}</p>
    </article>
  );
}

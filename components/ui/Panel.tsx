import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Panel({
  title,
  description,
  children,
  className = "",
}: PanelProps) {
  return (
    <section
      aria-label={title}
      className={`rounded-2xl border border-slate-200/80 bg-surface-raised p-5 shadow-[var(--shadow-panel)] transition-[border-color,box-shadow] duration-200 hover:border-slate-300/90 hover:shadow-[var(--shadow-panel-hover)] motion-reduce:transition-none sm:p-6 ${className}`}
    >
      <header className="min-h-14">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
      </header>
      <div className="mt-6">{children}</div>
    </section>
  );
}

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
      className={`rounded-2xl border border-slate-200/80 bg-surface-raised p-4 shadow-[var(--shadow-panel)] sm:p-5 ${className}`}
    >
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
      </header>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

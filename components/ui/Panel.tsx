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
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <header>
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

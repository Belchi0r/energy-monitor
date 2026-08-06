import { ArrowLeft, BadgeInfo } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  demoDescription: string;
  noticeTitle?: string;
  action?: ReactNode;
  showBackLink?: boolean;
  backHref?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  demoDescription,
  noticeTitle = "Dados demonstrativos",
  action,
  showBackLink = false,
  backHref = "/",
}: PageHeaderProps) {
  return (
    <section aria-labelledby="page-title">
      {showBackLink ? (
        <Link
          href={backHref}
          className="group mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-emerald-700 motion-reduce:transition-none"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-[border-color,transform] duration-200 group-hover:-translate-x-0.5 group-hover:border-emerald-200 motion-reduce:transform-none motion-reduce:transition-none">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </span>
          Voltar para visão geral
        </Link>
      ) : null}

      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">{eyebrow}</p>
          <h1
            id="page-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
          >
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {description}
          </p>
        </div>
        {action ? (
          <div className="w-full shrink-0 sm:w-auto">{action}</div>
        ) : null}
      </div>

      <aside
        aria-label="Aviso sobre os dados"
        className="mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4"
      >
        <BadgeInfo
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-emerald-700"
        />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            {noticeTitle}
          </p>
          <p className="mt-1 text-sm leading-5 text-emerald-800">
            {demoDescription}
          </p>
        </div>
      </aside>
    </section>
  );
}

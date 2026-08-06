import { CalendarClock, FlaskConical, PlugZap } from "lucide-react";
import Link from "next/link";

import { buildDashboardUrl } from "@/components/utils/dashboard-period";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

export type DashboardEmptyStateCardProps = {
  kind: "no-devices" | "historical-unavailable";
  title: string;
  description: string;
  supportingText?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel?: string;
};

type DashboardEmptyStateProps = {
  view: DashboardViewData;
  primaryHref?: string;
  secondaryHref?: string;
};

export function DashboardEmptyStateCard({
  kind,
  title,
  description,
  supportingText,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel = "Explorar demonstração",
}: DashboardEmptyStateCardProps) {
  const isOnboarding = kind === "no-devices";
  const Icon = isOnboarding ? PlugZap : CalendarClock;

  return (
    <section
      aria-labelledby="dashboard-empty-state-title"
      className="rounded-2xl border border-slate-200/80 bg-white px-5 py-10 text-center shadow-[var(--shadow-panel)] sm:px-8 sm:py-12"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h2
        id="dashboard-empty-state-title"
        className="mx-auto mt-4 max-w-2xl text-xl font-semibold tracking-tight text-slate-950"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      {supportingText ? (
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {supportingText}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none"
        >
          <FlaskConical aria-hidden="true" className="size-4" />
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}

export function DashboardEmptyState({
  view,
  primaryHref,
  secondaryHref,
}: DashboardEmptyStateProps) {
  const emptyState = view.emptyState;

  if (!emptyState) {
    return null;
  }

  const isOnboarding = emptyState.kind === "no-devices";

  return (
    <DashboardEmptyStateCard
      kind={emptyState.kind}
      title={emptyState.title}
      description={emptyState.description}
      supportingText={emptyState.supportingText}
      primaryHref={
        primaryHref ??
        (isOnboarding
          ? "/devices"
          : buildDashboardUrl("today", false, "home"))
      }
      primaryLabel={
        isOnboarding ? "Adicionar dispositivo" : "Ver consumo de hoje"
      }
      secondaryHref={
        secondaryHref ??
        buildDashboardUrl(view.period, view.compare, "demo")
      }
    />
  );
}

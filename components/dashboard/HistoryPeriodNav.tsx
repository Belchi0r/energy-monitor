"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PeriodComparisonControl } from "@/components/dashboard/PeriodComparisonControl";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import type { DashboardPeriod } from "@/lib/dashboard/types";

type HistoryPeriodNavProps = {
  period: DashboardPeriod;
  compare: boolean;
  comparisonLabel: string;
};

function buildHistoryUrl(period: DashboardPeriod, compare: boolean) {
  const params = new URLSearchParams({
    period,
    compare: compare ? "1" : "0",
  });

  return `/history?${params.toString()}`;
}

export function HistoryPeriodNav({
  period,
  compare,
  comparisonLabel,
}: HistoryPeriodNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(nextPeriod: DashboardPeriod, nextCompare: boolean) {
    startTransition(() => {
      router.push(buildHistoryUrl(nextPeriod, nextCompare), {
        scroll: false,
      });
    });
  }

  return (
    <div
      role="group"
      aria-label="Controles do histórico"
      aria-busy={isPending}
      className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-stretch"
    >
      <PeriodSelector
        period={period}
        disabled={isPending}
        onChange={(nextPeriod) => navigate(nextPeriod, compare)}
      />
      <PeriodComparisonControl
        checked={compare}
        comparisonLabel={comparisonLabel}
        disabled={isPending}
        onChange={(nextCompare) => navigate(period, nextCompare)}
      />
      <p className="sr-only" aria-live="polite">
        {isPending ? "Atualizando histórico." : "Histórico atualizado."}
      </p>
    </div>
  );
}

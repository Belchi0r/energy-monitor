"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PeriodComparisonControl } from "@/components/dashboard/PeriodComparisonControl";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import type { DashboardPeriod } from "@/components/types/dashboard";
import { buildDashboardUrl } from "@/components/utils/dashboard-period";

type DashboardPeriodControlsProps = {
  period: DashboardPeriod;
  compare: boolean;
  comparisonLabel: string;
};

export function DashboardPeriodControls({
  period,
  compare,
  comparisonLabel,
}: DashboardPeriodControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(nextPeriod: DashboardPeriod, nextCompare: boolean) {
    startTransition(() => {
      router.push(buildDashboardUrl(nextPeriod, nextCompare), {
        scroll: false,
      });
    });
  }

  return (
    <div
      aria-busy={isPending}
      aria-label="Controles da análise temporal"
      role="group"
      className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch lg:w-auto"
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
        {isPending ? "Atualizando período da análise." : "Análise atualizada."}
      </p>
    </div>
  );
}

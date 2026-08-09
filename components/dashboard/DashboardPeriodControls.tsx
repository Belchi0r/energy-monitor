"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PeriodComparisonControl } from "@/components/dashboard/PeriodComparisonControl";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { buildPublicDemoUrl } from "@/components/utils/public-demo-route";
import type {
  DashboardDataMode,
  DashboardPeriod,
} from "@/lib/dashboard/types";
import { buildDashboardUrl } from "@/components/utils/dashboard-period";

type DashboardPeriodControlsProps = {
  period: DashboardPeriod;
  compare: boolean;
  comparisonLabel: string;
  mode: DashboardDataMode;
  comparisonAvailable: boolean;
  experience?: "account" | "public-demo";
};

export function DashboardPeriodControls({
  period,
  compare,
  comparisonLabel,
  mode,
  comparisonAvailable,
  experience = "account",
}: DashboardPeriodControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(nextPeriod: DashboardPeriod, nextCompare: boolean) {
    startTransition(() => {
      const href =
        experience === "public-demo"
          ? buildPublicDemoUrl(nextPeriod, nextCompare)
          : buildDashboardUrl(nextPeriod, nextCompare, mode);

      router.push(href, {
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
        disabled={isPending || !comparisonAvailable}
        unavailable={!comparisonAvailable}
        onChange={(nextCompare) => navigate(period, nextCompare)}
      />
      <p className="sr-only" aria-live="polite">
        {isPending ? "Atualizando período da análise." : "Análise atualizada."}
      </p>
    </div>
  );
}

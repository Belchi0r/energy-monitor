import type { EnergyUsageAnalysis } from "@/lib/dashboard/analytics";
import { formatChartEnergy } from "@/lib/dashboard/formatters";

type EnergyChartSummaryProps = Pick<
  EnergyUsageAnalysis,
  "peak" | "minimum" | "averageKwh"
> & {
  averageLabel: string;
  pointNoun: string;
};

export function EnergyChartSummary({
  peak,
  minimum,
  averageKwh,
  averageLabel,
  pointNoun,
}: EnergyChartSummaryProps) {
  const summaryItems = [
    {
      label: "Pico",
      value: peak ? formatChartEnergy(peak.currentKwh) : "—",
      detail: peak?.currentLabel ?? "Sem dados",
    },
    {
      label: "Menor consumo",
      value: minimum ? formatChartEnergy(minimum.currentKwh) : "—",
      detail: minimum?.currentLabel ?? "Sem dados",
    },
    {
      label: averageLabel,
      value: formatChartEnergy(averageKwh),
      detail: `por ${pointNoun}`,
    },
  ] as const;

  return (
    <dl
      aria-label="Resumo da série temporal"
      className="grid gap-2 sm:grid-cols-3"
    >
      {summaryItems.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4"
        >
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-1.5 whitespace-nowrap text-base font-semibold tracking-tight tabular-nums text-slate-900">
            {item.value}
          </dd>
          <dd className="mt-1 text-xs leading-4 text-slate-500 [text-wrap:balance]">
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

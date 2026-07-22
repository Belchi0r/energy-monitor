import type { EnergyUsageAnalysis } from "@/components/utils/dashboard-insights";
import { formatChartEnergy } from "@/components/utils/formatters";

type EnergyChartSummaryProps = Pick<
  EnergyUsageAnalysis,
  "peak" | "minimum" | "averageKwh"
>;

export function EnergyChartSummary({
  peak,
  minimum,
  averageKwh,
}: EnergyChartSummaryProps) {
  const summaryItems = [
    {
      label: "Pico",
      value: peak ? formatChartEnergy(peak.consumptionKwh) : "—",
      detail: peak ? `às ${peak.time}` : "Sem dados",
    },
    {
      label: "Menor consumo",
      value: minimum ? formatChartEnergy(minimum.consumptionKwh) : "—",
      detail: minimum ? `às ${minimum.time}` : "Sem dados",
    },
    {
      label: "Média por intervalo",
      value: formatChartEnergy(averageKwh),
      detail: "a cada duas horas",
    },
  ] as const;

  return (
    <dl
      aria-label="Resumo do consumo ao longo do dia"
      className="grid gap-2 sm:grid-cols-3"
    >
      {summaryItems.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        >
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
            {item.value}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-500">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

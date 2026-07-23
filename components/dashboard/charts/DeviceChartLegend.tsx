import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";

import type { AnalyzedDeviceConsumption } from "@/lib/dashboard/analytics";
import {
  formatEnergy,
  formatPercentage,
  formatSignedRatioPercentage,
} from "@/lib/dashboard/formatters";

type DeviceChartLegendProps = {
  items: readonly AnalyzedDeviceConsumption[];
  totalKwh: number;
  activeIndex: number | null;
  selectedIndex: number | null;
  getColor: (index: number) => string;
  onHover: (index: number | null) => void;
  onFocus: (index: number | null) => void;
  onSelect: (index: number) => void;
  onClearSelection: () => void;
};

export function DeviceChartLegend({
  items,
  totalKwh,
  activeIndex,
  selectedIndex,
  getColor,
  onHover,
  onFocus,
  onSelect,
  onClearSelection,
}: DeviceChartLegendProps) {
  return (
    <ul
      aria-label="Legenda interativa de consumo por dispositivo"
      className="@container grid min-w-0 gap-2.5"
    >
      {items.map((item, index) => {
        const isActive = activeIndex === index;
        const isSelected = selectedIndex === index;
        const displayName = item.device.replaceAll("-", "‑");
        const comparison = item.periodComparison;
        const TrendIcon =
          comparison?.direction === "increase"
            ? ArrowUpRight
            : comparison?.direction === "decrease"
              ? ArrowDownRight
              : Minus;
        const trendTone =
          comparison?.significance === "relevant"
            ? "text-amber-800"
            : comparison?.significance === "moderate"
              ? "text-emerald-700"
              : "text-slate-600";
        const itemGrid = comparison
          ? "@min-[22rem]:grid-cols-[minmax(0,1.5fr)_minmax(6rem,0.7fr)_minmax(6.875rem,0.8fr)] @min-[22rem]:py-3.5"
          : "@min-[18rem]:grid-cols-[minmax(0,1.5fr)_minmax(6rem,0.7fr)] @min-[18rem]:py-3.5";

        return (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              aria-label={`${item.device}: ${formatEnergy(item.consumptionKwh)}, ${formatPercentage(item.consumptionKwh, totalKwh)} do total, ${item.rank}º no ranking. Pressione para ${isSelected ? "remover" : "fixar"} a seleção.`}
              aria-pressed={isSelected}
              onBlur={() => onFocus(null)}
              onClick={() => onSelect(index)}
              onFocus={() => onFocus(index)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onClearSelection();
                }
              }}
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
              className={`grid min-h-[4.75rem] w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 motion-reduce:transition-none ${itemGrid} ${
                isActive
                  ? "border-emerald-200 bg-emerald-50/60 shadow-sm"
                  : "border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:bg-white hover:shadow-sm"
              }`}
            >
              <span className="flex min-w-0 items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getColor(index) }}
                />
                <span className="min-w-0">
                  <span className="block break-normal text-base font-semibold leading-5 text-slate-900 [hyphens:none] [overflow-wrap:normal] [text-wrap:balance]">
                    {displayName}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                    {item.rank}º maior consumo
                  </span>
                </span>
              </span>

              <span className="min-w-0 text-right">
                <span className="block whitespace-nowrap text-xl font-bold leading-6 tracking-tight tabular-nums text-slate-950">
                  {formatEnergy(item.consumptionKwh)}
                </span>
                <span className="mt-0.5 block whitespace-nowrap text-sm font-medium leading-4 tabular-nums text-slate-500">
                  {formatPercentage(item.consumptionKwh, totalKwh)}
                </span>
              </span>

              {comparison ? (
                <span className="col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 pl-5 text-left @min-[22rem]:col-span-1 @min-[22rem]:block @min-[22rem]:pl-0">
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-base font-semibold leading-5 tabular-nums ${trendTone}`}
                  >
                    <TrendIcon aria-hidden="true" className="size-4" />
                    {formatSignedRatioPercentage(
                      comparison.percentageChange,
                    )}
                  </span>
                  <span className="text-xs leading-4 text-slate-500 @min-[22rem]:mt-0.5 @min-[22rem]:block">
                    vs. {comparison.previousLabel}
                  </span>
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

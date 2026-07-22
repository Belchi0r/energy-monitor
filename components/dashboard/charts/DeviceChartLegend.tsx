import type { AnalyzedDeviceConsumption } from "@/components/utils/dashboard-insights";
import {
  formatEnergy,
  formatPercentage,
} from "@/components/utils/formatters";

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
      className="grid gap-2 xl:grid-cols-2 2xl:grid-cols-1"
    >
      {items.map((item, index) => {
        const isActive = activeIndex === index;
        const isSelected = selectedIndex === index;

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
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 motion-reduce:transition-none ${
                isActive
                  ? "border-emerald-200 bg-emerald-50/70 shadow-sm"
                  : "border-transparent bg-slate-50/70 hover:border-slate-200 hover:bg-white"
              }`}
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getColor(index) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-5 text-slate-700">
                  {item.device}
                </span>
                <span className="block text-xs text-slate-500">
                  {item.rank}º maior consumo
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-slate-800">
                  {formatEnergy(item.consumptionKwh)}
                </span>
                <span className="block text-xs tabular-nums text-slate-500">
                  {formatPercentage(item.consumptionKwh, totalKwh)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

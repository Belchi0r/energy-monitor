import type { KeyboardEvent } from "react";
import type { DotItemDotProps } from "recharts";

import type { AnalyzedTemporalPoint } from "@/lib/dashboard/analytics";
import {
  formatChartEnergy,
  formatDetailedPercentage,
} from "@/lib/dashboard/formatters";

type EnergyChartPointProps = DotItemDotProps & {
  point: AnalyzedTemporalPoint;
  totalKwh: number;
  highlighted: boolean;
  selected: boolean;
  onPreview: (index: number | null) => void;
  onSelect: (index: number) => void;
  onKeyDown: (
    event: KeyboardEvent<SVGGElement>,
    index: number,
  ) => void;
};

export function EnergyChartPoint({
  cx,
  cy,
  index,
  point,
  totalKwh,
  highlighted,
  selected,
  onPreview,
  onSelect,
  onKeyDown,
}: EnergyChartPointProps) {
  if (cx === undefined || cy === undefined) {
    return null;
  }

  const markerRadius = highlighted || selected ? 6 : 3.5;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${point.currentLabel}: ${formatChartEnergy(point.currentKwh)}, ${formatDetailedPercentage(point.currentKwh, totalKwh)} do consumo do período. Pressione para ${selected ? "remover" : "fixar"} a seleção.`}
      aria-pressed={selected}
      onBlur={() => onPreview(null)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(index);
      }}
      onFocus={() => onPreview(index)}
      onKeyDown={(event) => onKeyDown(event, index)}
      onMouseEnter={() => onPreview(index)}
      onMouseLeave={() => onPreview(null)}
      className="cursor-pointer focus:outline-none"
    >
      <circle aria-hidden="true" cx={cx} cy={cy} r={12} fill="transparent" />
      <circle
        aria-hidden="true"
        cx={cx}
        cy={cy}
        r={markerRadius}
        fill="var(--surface-raised)"
        stroke="var(--chart-1)"
        strokeWidth={highlighted || selected ? 3 : 2}
        className="pointer-events-none transition-[r,stroke-width] duration-200 motion-reduce:transition-none"
      />
    </g>
  );
}

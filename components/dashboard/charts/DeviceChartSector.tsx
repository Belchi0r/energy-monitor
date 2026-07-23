import { motion } from "motion/react";
import type { KeyboardEvent } from "react";
import { Sector, type PieSectorShapeProps } from "recharts";

import type { AnalyzedDeviceConsumption } from "@/lib/dashboard/analytics";
import {
  formatEnergy,
  formatPercentage,
} from "@/lib/dashboard/formatters";

const RADIAN = Math.PI / 180;

type DeviceChartSectorProps = {
  shape: PieSectorShapeProps;
  item: AnalyzedDeviceConsumption;
  color: string;
  totalKwh: number;
  highlighted: boolean;
  selected: boolean;
  dimmed: boolean;
  reduceMotion: boolean;
  onBlur: () => void;
  onFocus: () => void;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<SVGPathElement>) => void;
};

export function DeviceChartSector({
  shape,
  item,
  color,
  totalKwh,
  highlighted,
  selected,
  dimmed,
  reduceMotion,
  onBlur,
  onFocus,
  onHover,
  onSelect,
  onKeyDown,
}: DeviceChartSectorProps) {
  const midAngle = shape.midAngle ?? 0;
  const offset = highlighted ? 4 : 0;
  const offsetX = Math.cos(-midAngle * RADIAN) * offset;
  const offsetY = Math.sin(-midAngle * RADIAN) * offset;
  const outerRadius = Number(shape.outerRadius ?? 0);
  const comparisonDescription = item.periodComparison
    ? ` ${item.periodComparison.message}`
    : "";

  return (
    <motion.g
      animate={{
        opacity: dimmed ? 0.34 : 1,
        x: reduceMotion ? 0 : offsetX,
        y: reduceMotion ? 0 : offsetY,
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.18,
        ease: "easeOut",
      }}
    >
      <Sector
        aria-label={`${item.device}: ${formatEnergy(item.consumptionKwh)}, ${formatPercentage(item.consumptionKwh, totalKwh)} do total, ${item.rank}º no ranking.${comparisonDescription} Pressione para ${selected ? "remover" : "fixar"} a seleção.`}
        aria-pressed={selected}
        role="button"
        tabIndex={0}
        cx={Number(shape.cx ?? 0)}
        cy={Number(shape.cy ?? 0)}
        innerRadius={Number(shape.innerRadius ?? 0)}
        outerRadius={outerRadius + (highlighted ? 4 : 0)}
        startAngle={shape.startAngle}
        endAngle={shape.endAngle}
        cornerRadius={shape.cornerRadius}
        fill={color}
        stroke="var(--surface-raised)"
        strokeWidth={highlighted ? 3 : 2}
        onBlur={onBlur}
        onClick={onSelect}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className="cursor-pointer focus:outline-none focus-visible:drop-shadow-[0_0_4px_rgba(16,185,129,0.9)]"
      />
    </motion.g>
  );
}

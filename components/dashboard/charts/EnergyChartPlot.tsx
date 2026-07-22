import type { ReactElement } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type MouseHandlerDataParam,
} from "recharts";

import { EnergyLineTooltip } from "@/components/dashboard/charts/EnergyLineTooltip";
import type {
  AnalyzedTemporalPoint,
  EnergyUsageAnalysis,
} from "@/components/utils/dashboard-insights";
import {
  formatChartEnergy,
  formatDecimal,
} from "@/components/utils/formatters";

type EnergyChartPlotProps = {
  analysis: EnergyUsageAnalysis;
  currentLabel: string;
  previousLabel?: string;
  selectedIndex: number | null;
  selectedPoint: AnalyzedTemporalPoint | null;
  animate: boolean;
  onChartClick: (state: MouseHandlerDataParam) => void;
  renderPoint: (props: DotItemDotProps) => ReactElement | null;
};

export function EnergyChartPlot({
  analysis,
  currentLabel,
  previousLabel,
  selectedIndex,
  selectedPoint,
  animate,
  onChartClick,
  renderPoint,
}: EnergyChartPlotProps) {
  return (
    <div className="h-72 min-w-0 sm:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          accessibilityLayer
          data={analysis.points}
          margin={{ top: 30, right: 14, bottom: 8, left: -12 }}
          onClick={onChartClick}
          title="Evolução do consumo simulado"
          desc="Série temporal do período selecionado. Os pontos atuais podem ser explorados com mouse, toque ou teclado."
        >
          <defs>
            <linearGradient
              id="energy-consumption-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--chart-grid)"
            strokeDasharray="4 4"
          />
          <XAxis
            axisLine={false}
            dataKey="axisLabel"
            minTickGap={22}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickFormatter={(value) => formatDecimal(Number(value))}
            tickLine={false}
            width={52}
          />
          <Tooltip
            allowEscapeViewBox={{ x: false, y: false }}
            cursor={{
              stroke: "var(--chart-cursor)",
              strokeDasharray: "4 4",
            }}
            content={(tooltipProps) => (
              <EnergyLineTooltip
                {...tooltipProps}
                points={analysis.points}
                totalKwh={analysis.totalKwh}
                currentLabel={currentLabel}
                previousLabel={previousLabel}
              />
            )}
            isAnimationActive={animate}
            animationDuration={180}
            wrapperStyle={{ outline: "none", zIndex: 20 }}
          />
          <Area
            animationDuration={700}
            animationEasing="ease-out"
            dataKey="currentKwh"
            fill="url(#energy-consumption-gradient)"
            isAnimationActive={animate}
            stroke="none"
            tooltipType="none"
            type="monotone"
          />
          {previousLabel ? (
            <Line
              activeDot={false}
              animationDuration={700}
              animationEasing="ease-out"
              dataKey="previousKwh"
              dot={false}
              isAnimationActive={animate}
              name={previousLabel}
              stroke="var(--chart-5)"
              strokeDasharray="6 5"
              strokeWidth={2}
              type="monotone"
            />
          ) : null}
          <Line
            activeDot={false}
            animationDuration={700}
            animationEasing="ease-out"
            dataKey="currentKwh"
            dot={renderPoint}
            isAnimationActive={animate}
            name={currentLabel}
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            type="monotone"
          />

          {analysis.peak && selectedIndex !== analysis.peak.index ? (
            <ReferenceDot
              x={analysis.peak.axisLabel}
              y={analysis.peak.currentKwh}
              r={4}
              fill="var(--chart-1)"
              stroke="var(--surface-raised)"
              strokeWidth={2}
              label={{
                value: "Pico",
                position: "top",
                fill: "var(--brand)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ) : null}
          {analysis.minimum && selectedIndex !== analysis.minimum.index ? (
            <ReferenceDot
              x={analysis.minimum.axisLabel}
              y={analysis.minimum.currentKwh}
              r={4}
              fill="var(--chart-5)"
              stroke="var(--surface-raised)"
              strokeWidth={2}
              label={{
                value: "Mínimo",
                position: "bottom",
                fill: "var(--text-muted)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ) : null}

          {selectedPoint ? (
            <>
              <ReferenceLine
                x={selectedPoint.axisLabel}
                stroke="var(--chart-1)"
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
              <ReferenceDot
                x={selectedPoint.axisLabel}
                y={selectedPoint.currentKwh}
                r={7}
                fill="var(--surface-raised)"
                stroke="var(--chart-1)"
                strokeWidth={3}
                label={{
                  value: formatChartEnergy(selectedPoint.currentKwh),
                  position: selectedPoint.isPeak ? "bottom" : "top",
                  fill: "var(--foreground)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            </>
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

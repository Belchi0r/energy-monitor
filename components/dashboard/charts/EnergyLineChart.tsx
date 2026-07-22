"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
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

import { ChartInsights } from "@/components/dashboard/charts/ChartInsights";
import { EnergyChartSummary } from "@/components/dashboard/charts/EnergyChartSummary";
import { EnergyLineTooltip } from "@/components/dashboard/charts/EnergyLineTooltip";
import type { EnergyUsagePoint } from "@/components/types/dashboard";
import { analyzeEnergyUsage } from "@/components/utils/dashboard-insights";
import {
  formatChartEnergy,
  formatDecimal,
  formatDetailedPercentage,
} from "@/components/utils/formatters";

type EnergyLineChartProps = {
  data: readonly EnergyUsagePoint[];
};

function isSelectionKey(key: string) {
  return key === "Enter" || key === " ";
}

export function EnergyLineChart({ data }: EnergyLineChartProps) {
  const analysis = useMemo(() => analyzeEnergyUsage(data), [data]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const figureRef = useRef<HTMLElement>(null);
  const selectedPoint =
    selectedIndex === null ? null : analysis.points[selectedIndex] ?? null;
  const highlightedIndex = previewIndex ?? selectedIndex;

  const toggleSelection = useCallback((index: number) => {
    setSelectedIndex((currentIndex) =>
      currentIndex === index ? null : index,
    );
  }, []);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    function handleOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !figureRef.current?.contains(event.target)
      ) {
        setSelectedIndex(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [selectedIndex]);

  const handlePointKeyDown = useCallback(
    (event: KeyboardEvent<SVGGElement>, index: number) => {
      if (isSelectionKey(event.key)) {
        event.preventDefault();
        toggleSelection(index);
      }

      if (event.key === "Escape") {
        setSelectedIndex(null);
        setPreviewIndex(null);
      }
    },
    [toggleSelection],
  );

  const handleChartClick = useCallback(
    (state: MouseHandlerDataParam) => {
      const index = Number(state.activeTooltipIndex);

      if (Number.isInteger(index) && analysis.points[index]) {
        toggleSelection(index);
      }
    },
    [analysis.points, toggleSelection],
  );

  const renderPoint = useCallback(
    (props: DotItemDotProps) => {
      const point = analysis.points[props.index];

      if (!point || props.cx === undefined || props.cy === undefined) {
        return null;
      }

      const isHighlighted = highlightedIndex === props.index;
      const isSelected = selectedIndex === props.index;
      const markerRadius = isHighlighted || isSelected ? 6 : 3.5;

      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={`${point.time}: ${formatChartEnergy(point.consumptionKwh)}, ${formatDetailedPercentage(point.consumptionKwh, analysis.totalKwh)} do consumo diário. Pressione para ${isSelected ? "remover" : "fixar"} a seleção.`}
          aria-pressed={isSelected}
          onBlur={() => setPreviewIndex(null)}
          onClick={(event) => {
            event.stopPropagation();
            toggleSelection(props.index);
          }}
          onFocus={() => setPreviewIndex(props.index)}
          onKeyDown={(event) => handlePointKeyDown(event, props.index)}
          onMouseEnter={() => setPreviewIndex(props.index)}
          onMouseLeave={() => setPreviewIndex(null)}
          className="cursor-pointer focus:outline-none"
        >
          <circle
            aria-hidden="true"
            cx={props.cx}
            cy={props.cy}
            r={12}
            fill="transparent"
          />
          <circle
            aria-hidden="true"
            cx={props.cx}
            cy={props.cy}
            r={markerRadius}
            fill="var(--surface-raised)"
            stroke="var(--chart-1)"
            strokeWidth={isHighlighted || isSelected ? 3 : 2}
            className="pointer-events-none transition-[r,stroke-width] duration-200 motion-reduce:transition-none"
          />
        </g>
      );
    },
    [
      analysis.points,
      analysis.totalKwh,
      handlePointKeyDown,
      highlightedIndex,
      selectedIndex,
      toggleSelection,
    ],
  );

  return (
    <figure ref={figureRef} className="min-w-0">
      <figcaption className="sr-only">
        Gráfico interativo com o consumo simulado de energia ao longo do dia,
        em intervalos de duas horas.
      </figcaption>

      <ChartInsights
        insights={analysis.insights}
        label="Principais conclusões do consumo ao longo do dia"
      />

      <div className="mt-4 h-72 min-w-0 sm:h-80 lg:h-96">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            accessibilityLayer
            data={analysis.points}
            margin={{ top: 30, right: 14, bottom: 8, left: -12 }}
            onClick={handleChartClick}
            title="Consumo simulado ao longo do dia"
            desc="Valores de consumo em quilowatt-hora entre zero e vinte e duas horas. Os pontos podem ser selecionados com mouse, toque ou teclado."
          >
            <defs>
              <linearGradient
                id="energy-consumption-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeDasharray="4 4"
            />
            <XAxis
              axisLine={false}
              dataKey="time"
              minTickGap={20}
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
                />
              )}
              isAnimationActive="auto"
              animationDuration={180}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
            />
            <Area
              animationDuration={700}
              animationEasing="ease-out"
              dataKey="consumptionKwh"
              fill="url(#energy-consumption-gradient)"
              isAnimationActive="auto"
              stroke="none"
              tooltipType="none"
              type="monotone"
            />
            <Line
              activeDot={false}
              animationDuration={700}
              animationEasing="ease-out"
              dataKey="consumptionKwh"
              dot={renderPoint}
              isAnimationActive="auto"
              name="Consumo"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              type="monotone"
            />

            {analysis.peak && selectedIndex !== analysis.peak.index ? (
              <ReferenceDot
                x={analysis.peak.time}
                y={analysis.peak.consumptionKwh}
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
                x={analysis.minimum.time}
                y={analysis.minimum.consumptionKwh}
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
                  x={selectedPoint.time}
                  stroke="var(--chart-1)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
                <ReferenceDot
                  x={selectedPoint.time}
                  y={selectedPoint.consumptionKwh}
                  r={7}
                  fill="var(--surface-raised)"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  label={{
                    value: formatChartEnergy(selectedPoint.consumptionKwh),
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

      <div className="mt-4">
        <EnergyChartSummary
          averageKwh={analysis.averageKwh}
          minimum={analysis.minimum}
          peak={analysis.peak}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Passe o cursor ou use Tab para explorar os pontos. Clique, toque ou
        pressione Enter para fixar uma leitura; repita a ação ou pressione Esc
        para limpar.
      </p>
      <p className="sr-only" aria-live="polite">
        {selectedPoint
          ? `Leitura fixada em ${selectedPoint.time}: ${formatChartEnergy(selectedPoint.consumptionKwh)}.`
          : "Nenhuma leitura do gráfico está fixada."}
      </p>
    </figure>
  );
}

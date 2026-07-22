"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  type PieSectorShapeProps,
} from "recharts";

import { ChartInsights } from "@/components/dashboard/charts/ChartInsights";
import { DeviceChartCenter } from "@/components/dashboard/charts/DeviceChartCenter";
import { DeviceChartLegend } from "@/components/dashboard/charts/DeviceChartLegend";
import { DeviceChartSector } from "@/components/dashboard/charts/DeviceChartSector";
import { DeviceDistributionTooltip } from "@/components/dashboard/charts/DeviceDistributionTooltip";
import type { DeviceConsumptionAnalysis } from "@/components/utils/dashboard-insights";
import {
  formatEnergy,
  formatPercentage,
} from "@/components/utils/formatters";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

type DeviceDistributionChartProps = {
  analysis: DeviceConsumptionAnalysis;
  currentLabel: string;
  previousLabel?: string;
};

function isSelectionKey(key: string) {
  return key === "Enter" || key === " ";
}

export function DeviceDistributionChart({
  analysis,
  currentLabel,
  previousLabel,
}: DeviceDistributionChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const figureRef = useRef<HTMLElement>(null);
  const activeIndex = hoveredIndex ?? focusedIndex ?? selectedIndex;
  const activeItem =
    activeIndex === null ? null : analysis.items[activeIndex] ?? null;
  const selectedItem =
    selectedIndex === null ? null : analysis.items[selectedIndex] ?? null;

  const getColor = useCallback(
    (index: number) => chartColors[index % chartColors.length],
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedIndex(null);
  }, []);

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

  const handleSectorKeyDown = useCallback(
    (event: KeyboardEvent<SVGPathElement>, index: number) => {
      if (isSelectionKey(event.key)) {
        event.preventDefault();
        toggleSelection(index);
      }

      if (event.key === "Escape") {
        clearSelection();
        setHoveredIndex(null);
        setFocusedIndex(null);
      }
    },
    [clearSelection, toggleSelection],
  );

  const renderSector = useCallback(
    (shape: PieSectorShapeProps) => {
      const item = analysis.items[shape.index];

      if (!item) {
        return <g />;
      }

      const highlighted = activeIndex === shape.index || shape.isActive;

      return (
        <DeviceChartSector
          shape={shape}
          item={item}
          color={getColor(shape.index)}
          totalKwh={analysis.totalKwh}
          highlighted={highlighted}
          selected={selectedIndex === shape.index}
          dimmed={activeIndex !== null && !highlighted}
          reduceMotion={Boolean(shouldReduceMotion)}
          onBlur={() => setFocusedIndex(null)}
          onFocus={() => setFocusedIndex(shape.index)}
          onHover={(hovered) =>
            setHoveredIndex(hovered ? shape.index : null)
          }
          onSelect={() => toggleSelection(shape.index)}
          onKeyDown={(event) => handleSectorKeyDown(event, shape.index)}
        />
      );
    },
    [
      activeIndex,
      analysis.items,
      analysis.totalKwh,
      getColor,
      handleSectorKeyDown,
      selectedIndex,
      shouldReduceMotion,
      toggleSelection,
    ],
  );

  return (
    <figure ref={figureRef} className="min-w-0">
      <figcaption className="sr-only">
        Gráfico de rosca interativo com a distribuição simulada do consumo por
        dispositivo no período selecionado.
      </figcaption>

      <ChartInsights
        insights={analysis.insights}
        label="Principais conclusões do consumo por dispositivo"
      />

      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] md:items-center">
        <div className="relative h-72 min-w-0 sm:h-80 md:h-[25rem]">
          <DeviceDistributionTooltip
            item={activeItem}
            totalDevices={analysis.items.length}
            totalKwh={analysis.totalKwh}
            previousLabel={previousLabel}
          />

          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart
              accessibilityLayer
              title="Consumo simulado por dispositivo"
              desc="Distribuição do consumo do período. Os setores podem ser selecionados com mouse, toque ou teclado."
            >
              <Pie
                animationDuration={700}
                animationEasing="ease-out"
                data={analysis.items}
                dataKey="consumptionKwh"
                endAngle={-270}
                innerRadius="61%"
                isAnimationActive={!shouldReduceMotion}
                nameKey="device"
                outerRadius="82%"
                paddingAngle={3}
                rootTabIndex={-1}
                shape={renderSector}
                startAngle={90}
              >
                {analysis.items.map((item, index) => (
                  <Cell
                    key={item.id}
                    fill={getColor(index)}
                    stroke="var(--surface-raised)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <DeviceChartCenter
            item={activeItem}
            totalKwh={analysis.totalKwh}
            currentLabel={currentLabel}
          />
        </div>

        <DeviceChartLegend
          activeIndex={activeIndex}
          getColor={getColor}
          items={analysis.items}
          onClearSelection={clearSelection}
          onFocus={setFocusedIndex}
          onHover={setHoveredIndex}
          onSelect={toggleSelection}
          selectedIndex={selectedIndex}
          totalKwh={analysis.totalKwh}
        />
      </div>

      <p className="mt-2 text-xs leading-4 text-slate-500">
        Passe o cursor, toque em um setor ou navegue pela legenda. Clique ou
        pressione Enter para fixar um dispositivo; repita a ação ou pressione
        Esc para limpar.
      </p>
      <p className="sr-only" aria-live="polite">
        {selectedItem
          ? `${selectedItem.device} fixado: ${formatEnergy(selectedItem.consumptionKwh)}, ${formatPercentage(selectedItem.consumptionKwh, analysis.totalKwh)} do total, ${selectedItem.periodComparison?.message ?? selectedItem.comparison}`
          : "Nenhum dispositivo está fixado no gráfico."}
      </p>
    </figure>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  type PieSectorShapeProps,
} from "recharts";

import { ChartInsights } from "@/components/dashboard/charts/ChartInsights";
import { DeviceChartLegend } from "@/components/dashboard/charts/DeviceChartLegend";
import { DeviceDistributionTooltip } from "@/components/dashboard/charts/DeviceDistributionTooltip";
import type { DeviceConsumption } from "@/components/types/dashboard";
import { analyzeDeviceConsumption } from "@/components/utils/dashboard-insights";
import {
  formatDecimal,
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

const RADIAN = Math.PI / 180;

type DeviceDistributionChartProps = {
  data: readonly DeviceConsumption[];
};

function isSelectionKey(key: string) {
  return key === "Enter" || key === " ";
}

export function DeviceDistributionChart({
  data,
}: DeviceDistributionChartProps) {
  const analysis = useMemo(() => analyzeDeviceConsumption(data), [data]);
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
    (props: PieSectorShapeProps) => {
      const item = analysis.items[props.index];

      if (!item) {
        return <g />;
      }

      const isHighlighted = activeIndex === props.index || props.isActive;
      const isSelected = selectedIndex === props.index;
      const shouldDim = activeIndex !== null && !isHighlighted;
      const midAngle = props.midAngle ?? 0;
      const offset = isHighlighted ? 4 : 0;
      const offsetX = Math.cos(-midAngle * RADIAN) * offset;
      const offsetY = Math.sin(-midAngle * RADIAN) * offset;
      const outerRadius = Number(props.outerRadius ?? 0);

      return (
        <motion.g
          animate={{
            opacity: shouldDim ? 0.34 : 1,
            x: shouldReduceMotion ? 0 : offsetX,
            y: shouldReduceMotion ? 0 : offsetY,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.18,
            ease: "easeOut",
          }}
        >
          <Sector
            aria-label={`${item.device}: ${formatEnergy(item.consumptionKwh)}, ${formatPercentage(item.consumptionKwh, analysis.totalKwh)} do total, ${item.rank}º no ranking. Pressione para ${isSelected ? "remover" : "fixar"} a seleção.`}
            aria-pressed={isSelected}
            role="button"
            tabIndex={0}
            cx={Number(props.cx ?? 0)}
            cy={Number(props.cy ?? 0)}
            innerRadius={Number(props.innerRadius ?? 0)}
            outerRadius={outerRadius + (isHighlighted ? 4 : 0)}
            startAngle={props.startAngle}
            endAngle={props.endAngle}
            cornerRadius={props.cornerRadius}
            fill={getColor(props.index)}
            stroke="var(--surface-raised)"
            strokeWidth={isHighlighted ? 3 : 2}
            onBlur={() => setFocusedIndex(null)}
            onClick={() => toggleSelection(props.index)}
            onFocus={() => setFocusedIndex(props.index)}
            onKeyDown={(event) => handleSectorKeyDown(event, props.index)}
            onMouseEnter={() => setHoveredIndex(props.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="cursor-pointer focus:outline-none focus-visible:drop-shadow-[0_0_4px_rgba(16,185,129,0.9)]"
          />
        </motion.g>
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
        Gráfico de rosca interativo com a distribuição simulada do consumo entre
        cinco grupos de dispositivos.
      </figcaption>

      <ChartInsights
        insights={analysis.insights}
        label="Principais conclusões do consumo por dispositivo"
      />

      <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.9fr)] sm:items-center xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(12rem,0.9fr)]">
        <div className="relative h-72 min-w-0 sm:h-80 xl:h-72 2xl:h-80">
          <DeviceDistributionTooltip
            item={activeItem}
            totalDevices={analysis.items.length}
            totalKwh={analysis.totalKwh}
          />

          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart
              accessibilityLayer
              title="Consumo simulado por dispositivo"
              desc="Distribuição do consumo total de oito vírgula sete quilowatt-hora. Os setores podem ser selecionados com mouse, toque ou teclado."
            >
              <Pie
                animationDuration={700}
                animationEasing="ease-out"
                data={analysis.items}
                dataKey="consumptionKwh"
                endAngle={-270}
                innerRadius="61%"
                isAnimationActive="auto"
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

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 pt-2"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={activeItem?.id ?? "total"}
                initial={
                  shouldReduceMotion ? false : { opacity: 0, y: 4 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.18,
                  ease: "easeOut",
                }}
                className="w-32 text-center"
              >
                {activeItem ? (
                  <>
                    <p className="text-xs font-semibold leading-4 text-slate-800">
                      {activeItem.device}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-slate-950">
                      {formatDecimal(activeItem.consumptionKwh)}
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        kWh
                      </span>
                    </p>
                    <p className="text-xs font-semibold tabular-nums text-emerald-700">
                      {formatPercentage(
                        activeItem.consumptionKwh,
                        analysis.totalKwh,
                      )}{" "}
                      do total
                    </p>
                    <p className="mt-1 text-[10px] leading-3.5 text-slate-500">
                      {activeItem.description}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums text-slate-950">
                      {formatDecimal(analysis.totalKwh)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      kWh no total
                    </p>
                    <p className="mt-1 text-[10px] leading-3.5 text-slate-500">
                      cenário demonstrativo
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
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

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Passe o cursor, toque em um setor ou navegue pela legenda. Clique ou
        pressione Enter para fixar um dispositivo; repita a ação ou pressione
        Esc para limpar.
      </p>
      <p className="sr-only" aria-live="polite">
        {selectedItem
          ? `${selectedItem.device} fixado: ${formatEnergy(selectedItem.consumptionKwh)}, ${formatPercentage(selectedItem.consumptionKwh, analysis.totalKwh)} do total, ${selectedItem.comparison}`
          : "Nenhum dispositivo está fixado no gráfico."}
      </p>
    </figure>
  );
}

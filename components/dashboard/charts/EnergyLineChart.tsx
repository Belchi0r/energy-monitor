"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import type {
  DotItemDotProps,
  MouseHandlerDataParam,
} from "recharts";

import { ChartInsights } from "@/components/dashboard/charts/ChartInsights";
import { ComparisonLegend } from "@/components/dashboard/charts/ComparisonLegend";
import { EnergyChartPlot } from "@/components/dashboard/charts/EnergyChartPlot";
import { EnergyChartPoint } from "@/components/dashboard/charts/EnergyChartPoint";
import { EnergyChartSummary } from "@/components/dashboard/charts/EnergyChartSummary";
import type { EnergyUsageAnalysis } from "@/components/utils/dashboard-insights";
import { formatChartEnergy } from "@/components/utils/formatters";

type EnergyLineChartProps = {
  analysis: EnergyUsageAnalysis;
  averageLabel: string;
  currentLabel: string;
  previousLabel?: string;
  pointNoun: string;
};

function isSelectionKey(key: string) {
  return key === "Enter" || key === " ";
}

export function EnergyLineChart({
  analysis,
  averageLabel,
  currentLabel,
  previousLabel,
  pointNoun,
}: EnergyLineChartProps) {
  const shouldReduceMotion = useReducedMotion();
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

      if (!point) {
        return null;
      }

      return (
        <EnergyChartPoint
          {...props}
          point={point}
          totalKwh={analysis.totalKwh}
          highlighted={highlightedIndex === props.index}
          selected={selectedIndex === props.index}
          onPreview={setPreviewIndex}
          onSelect={toggleSelection}
          onKeyDown={handlePointKeyDown}
        />
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
        Gráfico interativo do consumo simulado no período selecionado.
      </figcaption>

      <ChartInsights
        insights={analysis.insights}
        label="Principais conclusões da série temporal"
      />
      <ComparisonLegend
        currentLabel={currentLabel}
        previousLabel={previousLabel}
      />

      <div className="mt-2">
        <EnergyChartPlot
          analysis={analysis}
          currentLabel={currentLabel}
          previousLabel={previousLabel}
          selectedIndex={selectedIndex}
          selectedPoint={selectedPoint}
          animate={!shouldReduceMotion}
          onChartClick={handleChartClick}
          renderPoint={renderPoint}
        />
      </div>

      <div className="mt-4">
        <EnergyChartSummary
          averageKwh={analysis.averageKwh}
          averageLabel={averageLabel}
          minimum={analysis.minimum}
          peak={analysis.peak}
          pointNoun={pointNoun}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Passe o cursor ou use Tab para explorar os pontos. Clique, toque ou
        pressione Enter para fixar uma leitura; repita a ação ou pressione Esc
        para limpar.
      </p>
      <p className="sr-only" aria-live="polite">
        {selectedPoint
          ? `Leitura fixada em ${selectedPoint.currentLabel}: ${formatChartEnergy(selectedPoint.currentKwh)}.`
          : "Nenhuma leitura do gráfico está fixada."}
      </p>
    </figure>
  );
}

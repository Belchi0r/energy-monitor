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
import type { EnergyUsageAnalysis } from "@/lib/dashboard/analytics";
import { formatChartEnergy } from "@/lib/dashboard/formatters";

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
        Gráfico interativo do consumo no período selecionado.
      </figcaption>

      <ChartInsights
        insights={analysis.insights}
        label="Principais conclusões da série temporal"
      />

      {analysis.points.length === 0 ? (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center"
        >
          <p className="text-sm font-semibold text-slate-900">
            Nenhuma estimativa de consumo disponível
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-slate-500">
            Adicione dispositivos para preparar as estimativas da sua residência.
          </p>
        </div>
      ) : (
        <>
          <ComparisonLegend
          currentLabel={currentLabel}
          previousLabel={previousLabel}
          />
          {analysis.totalKwh === 0 ? (
            <div
              role="status"
              className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-5 text-slate-600"
            >
              Não há consumo estimado porque nenhum dispositivo ativo possui
              potência e tempo de uso válidos.
            </div>
          ) : null}
          <div className="mt-1">
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
          <div className="mt-3">
            <EnergyChartSummary
              averageKwh={analysis.averageKwh}
              averageLabel={averageLabel}
              minimum={analysis.minimum}
              peak={analysis.peak}
              pointNoun={pointNoun}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Explore com mouse, toque ou Tab. Use Enter para fixar uma leitura e
            Esc para limpar.
          </p>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {selectedPoint
          ? `Leitura fixada em ${selectedPoint.currentLabel}: ${formatChartEnergy(selectedPoint.currentKwh)}.`
          : "Nenhuma leitura do gráfico está fixada."}
      </p>
    </figure>
  );
}

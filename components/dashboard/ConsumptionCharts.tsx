import { DeviceDistributionChart } from "@/components/dashboard/charts/DeviceDistributionChart";
import { EnergyLineChart } from "@/components/dashboard/charts/EnergyLineChart";
import type { DashboardPeriodDefinition } from "@/lib/dashboard/types";
import type {
  DeviceConsumptionAnalysis,
  EnergyUsageAnalysis,
} from "@/lib/dashboard/analytics";
import { Panel } from "@/components/ui/Panel";

type ConsumptionChartsProps = {
  temporalAnalysis: EnergyUsageAnalysis;
  deviceAnalysis: DeviceConsumptionAnalysis;
  definition: DashboardPeriodDefinition;
  currentLabel: string;
  previousLabel?: string;
  deviceDataSource:
    | "registered-estimate"
    | "simulated-snapshot";
};

export function ConsumptionCharts({
  temporalAnalysis,
  deviceAnalysis,
  definition,
  currentLabel,
  previousLabel,
  deviceDataSource,
}: ConsumptionChartsProps) {
  const temporalPreviousLabel = temporalAnalysis.points.some(
    (point) => point.previousKwh !== undefined,
  )
    ? previousLabel
    : undefined;

  return (
    <section
      aria-label="Visualizações de consumo"
      className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2"
    >
      <Panel
        title={definition.chartTitle}
        description={definition.chartDescription}
        className="min-w-0 bg-white"
      >
        <EnergyLineChart
          analysis={temporalAnalysis}
          averageLabel={definition.averageLabel}
          currentLabel={currentLabel}
          previousLabel={temporalPreviousLabel}
          pointNoun={definition.pointNoun}
        />
      </Panel>

      <Panel
        title="Consumo por dispositivo"
        description={
          deviceDataSource === "registered-estimate"
            ? definition.period === "today"
              ? "Estimativa diária dos dispositivos ativos cadastrados"
              : "Histórico estimado acumulado por dispositivo cadastrado"
            : `Distribuição simulada em ${definition.label.toLocaleLowerCase("pt-BR")}`
        }
        className="min-w-0 bg-slate-50/40"
      >
        <DeviceDistributionChart
          analysis={deviceAnalysis}
          currentLabel={currentLabel}
          previousLabel={previousLabel}
        />
      </Panel>
    </section>
  );
}

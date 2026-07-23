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
};

export function ConsumptionCharts({
  temporalAnalysis,
  deviceAnalysis,
  definition,
  currentLabel,
  previousLabel,
}: ConsumptionChartsProps) {
  return (
    <section
      aria-label="Visualizações de consumo"
      className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] 2xl:grid-cols-[minmax(0,0.95fr)_minmax(38rem,1.05fr)]"
    >
      <Panel
        title={definition.chartTitle}
        description={definition.chartDescription}
        className="min-w-0"
      >
        <EnergyLineChart
          analysis={temporalAnalysis}
          averageLabel={definition.averageLabel}
          currentLabel={currentLabel}
          previousLabel={previousLabel}
          pointNoun={definition.pointNoun}
        />
      </Panel>

      <Panel
        title="Consumo por dispositivo"
        description={`Distribuição simulada em ${definition.label.toLocaleLowerCase("pt-BR")}`}
        className="min-w-0"
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

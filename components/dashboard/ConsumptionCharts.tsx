import { DeviceDistributionChart } from "@/components/dashboard/charts/DeviceDistributionChart";
import { EnergyLineChart } from "@/components/dashboard/charts/EnergyLineChart";
import type {
  DeviceConsumption,
  EnergyUsagePoint,
} from "@/components/types/dashboard";
import { Panel } from "@/components/ui/Panel";

type ConsumptionChartsProps = {
  energyUsage: readonly EnergyUsagePoint[];
  deviceConsumption: readonly DeviceConsumption[];
};

export function ConsumptionCharts({
  energyUsage,
  deviceConsumption,
}: ConsumptionChartsProps) {
  return (
    <section
      aria-label="Visualizações de consumo"
      className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
    >
      <Panel
        title="Consumo ao longo do dia"
        description="Amostra simulada em intervalos de duas horas"
        className="min-w-0"
      >
        <EnergyLineChart data={energyUsage} />
      </Panel>

      <Panel
        title="Consumo por dispositivo"
        description="Distribuição simulada do consumo acumulado"
        className="min-w-0"
      >
        <DeviceDistributionChart data={deviceConsumption} />
      </Panel>
    </section>
  );
}

import { dashboardDatasets, getDashboardDataset } from "@/components/data/periods";
import type {
  DashboardMetric,
  DashboardPeriod,
  DashboardPeriodDefinition,
} from "@/components/types/dashboard";
import {
  compareNumbers,
  sumEnergy,
  validateDashboardDataset,
} from "@/components/utils/dashboard-comparison";
import {
  analyzeDeviceConsumption,
  analyzeEnergyUsage,
  type DeviceConsumptionAnalysis,
  type EnergyUsageAnalysis,
} from "@/components/utils/dashboard-insights";
import { getPeriodDefinition } from "@/components/utils/dashboard-period";

const SIMULATED_TARIFF_PER_KWH = 0.84;

Object.values(dashboardDatasets).forEach(validateDashboardDataset);

export type DashboardViewData = {
  period: DashboardPeriod;
  compare: boolean;
  definition: DashboardPeriodDefinition;
  currentLabel: string;
  previousLabel?: string;
  metrics: readonly DashboardMetric[];
  temporalAnalysis: EnergyUsageAnalysis;
  deviceAnalysis: DeviceConsumptionAnalysis;
  activities: ReturnType<typeof getDashboardDataset>["recentActivities"];
  transitionKey: string;
};

function buildMetrics(
  period: DashboardPeriod,
  compare: boolean,
  definition: DashboardPeriodDefinition,
) {
  const current = getDashboardDataset(definition.currentDatasetId);
  const previous = getDashboardDataset(definition.previousDatasetId);
  const total = sumEnergy(current.energyUsage);
  const previousTotal = sumEnergy(previous.energyUsage);
  const comparison = (currentValue: number, previousValue: number) =>
    compare
      ? compareNumbers(
          currentValue,
          previousValue,
          definition.comparisonLabel,
        )
      : undefined;

  if (period === "today") {
    return [
      {
        id: "currentPower",
        title: "Potência atual",
        value: current.currentPowerW ?? 0,
        format: "power",
        description: "Leitura simulada no momento",
        comparison: comparison(
          current.currentPowerW ?? 0,
          previous.currentPowerW ?? 0,
        ),
      },
      {
        id: "periodConsumption",
        title: "Consumo hoje",
        value: total,
        format: "energy",
        description: "Acumulado demonstrativo desde 00h",
        comparison: comparison(total, previousTotal),
      },
      {
        id: "estimatedCost",
        title: "Custo estimado",
        value: total * SIMULATED_TARIFF_PER_KWH,
        format: "currency",
        description: "Tarifa simulada de R$ 0,84/kWh",
        comparison: comparison(
          total * SIMULATED_TARIFF_PER_KWH,
          previousTotal * SIMULATED_TARIFF_PER_KWH,
        ),
      },
      {
        id: "activeDevices",
        title: "Dispositivos ativos",
        value: current.activeDevices,
        format: "integer",
        description: "Equipamentos no cenário demonstrativo",
        comparison: comparison(current.activeDevices, previous.activeDevices),
      },
    ] satisfies readonly DashboardMetric[];
  }

  const topDevice = [...current.deviceConsumption].sort(
    (first, second) => second.consumptionKwh - first.consumptionKwh,
  )[0];
  const previousTopDevice = previous.deviceConsumption.find(
    (item) => item.id === topDevice.id,
  );

  return [
    {
      id: "periodConsumption",
      title: "Consumo no período",
      value: total,
      format: "energy",
      description: `Total simulado em ${current.daysCount} dias`,
      comparison: comparison(total, previousTotal),
    },
    {
      id: "dailyAverage",
      title: "Média diária",
      value: total / current.daysCount,
      format: "energy",
      description: "Média demonstrativa por dia",
      comparison: comparison(
        total / current.daysCount,
        previousTotal / previous.daysCount,
      ),
    },
    {
      id: "estimatedCost",
      title: "Custo estimado",
      value: total * SIMULATED_TARIFF_PER_KWH,
      format: "currency",
      description: "Tarifa simulada de R$ 0,84/kWh",
      comparison: comparison(
        total * SIMULATED_TARIFF_PER_KWH,
        previousTotal * SIMULATED_TARIFF_PER_KWH,
      ),
    },
    {
      id: "topDevice",
      title: "Maior consumo",
      value: topDevice.consumptionKwh,
      format: "energy",
      description: topDevice.device,
      comparison: comparison(
        topDevice.consumptionKwh,
        previousTopDevice?.consumptionKwh ?? 0,
      ),
    },
  ] satisfies readonly DashboardMetric[];
}

export function getDashboardViewData(
  period: DashboardPeriod,
  compare: boolean,
): DashboardViewData {
  const definition = getPeriodDefinition(period);
  const current = getDashboardDataset(definition.currentDatasetId);
  const previous = compare
    ? getDashboardDataset(definition.previousDatasetId)
    : undefined;

  return {
    period,
    compare,
    definition,
    currentLabel: current.label,
    previousLabel: previous?.label,
    metrics: buildMetrics(period, compare, definition),
    temporalAnalysis: analyzeEnergyUsage(current, definition, previous),
    deviceAnalysis: analyzeDeviceConsumption(
      current.deviceConsumption,
      previous?.deviceConsumption,
      definition.comparisonLabel,
    ),
    activities: current.recentActivities.slice(0, 5),
    transitionKey: `${period}-${compare ? "comparison" : "current"}`,
  };
}

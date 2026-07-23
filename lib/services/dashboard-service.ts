import type { DashboardAlert } from "@/lib/dashboard/alert-types";
import {
  analyzeDeviceConsumption,
  analyzeEnergyUsage,
  type DeviceConsumptionAnalysis,
  type EnergyUsageAnalysis,
} from "@/lib/dashboard/analytics";
import { generateDashboardAlerts } from "@/lib/dashboard/alerts";
import {
  compareNumbers,
  sumEnergy,
} from "@/lib/dashboard/comparison";
import { getPeriodDefinition } from "@/lib/dashboard/periods";
import {
  buildDashboardTimeline,
  type DashboardTimeline,
} from "@/lib/dashboard/timeline";
import type {
  DashboardDataset,
  DashboardMetric,
  DashboardPeriod,
  DashboardPeriodDefinition,
  RecentActivity,
} from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";
import type { DashboardQuery } from "@/lib/schemas/dashboard-query-schema";

const SIMULATED_TARIFF_PER_KWH = 0.84;
const CURRENCY_DECIMAL_FACTOR = 100;

function normalizeMonetaryValue(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) * CURRENCY_DECIMAL_FACTOR,
    ) / CURRENCY_DECIMAL_FACTOR
  );
}

function compareMonetaryValues(
  currentValue: number,
  previousValue: number,
  previousLabel: string,
) {
  const comparison = compareNumbers(
    currentValue,
    previousValue,
    previousLabel,
  );

  return {
    ...comparison,
    absoluteChange: normalizeMonetaryValue(comparison.absoluteChange),
  };
}

export type DashboardViewData = {
  period: DashboardPeriod;
  compare: boolean;
  definition: DashboardPeriodDefinition;
  currentLabel: string;
  previousLabel?: string;
  metrics: readonly DashboardMetric[];
  temporalAnalysis: EnergyUsageAnalysis;
  deviceAnalysis: DeviceConsumptionAnalysis;
  alerts: readonly DashboardAlert[];
  timeline: DashboardTimeline;
  activities: readonly RecentActivity[];
  transitionKey: string;
};

function buildMetrics(
  period: DashboardPeriod,
  compare: boolean,
  definition: DashboardPeriodDefinition,
  current: DashboardDataset,
  previous?: DashboardDataset,
) {
  const total = sumEnergy(current.energyUsage);
  const previousTotal = previous ? sumEnergy(previous.energyUsage) : 0;
  const estimatedCost = normalizeMonetaryValue(
    total * SIMULATED_TARIFF_PER_KWH,
  );
  const previousEstimatedCost = normalizeMonetaryValue(
    previousTotal * SIMULATED_TARIFF_PER_KWH,
  );
  const comparison = (currentValue: number, previousValue: number) =>
    compare && previous
      ? compareNumbers(
          currentValue,
          previousValue,
          definition.comparisonLabel,
        )
      : undefined;
  const estimatedCostComparison =
    compare && previous
      ? compareMonetaryValues(
          estimatedCost,
          previousEstimatedCost,
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
          previous?.currentPowerW ?? 0,
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
        value: estimatedCost,
        format: "currency",
        description: "Tarifa simulada de R$ 0,84/kWh",
        comparison: estimatedCostComparison,
      },
      {
        id: "activeDevices",
        title: "Dispositivos ativos",
        value: current.activeDevices,
        format: "integer",
        description: "Equipamentos no cenário demonstrativo",
        comparison: comparison(
          current.activeDevices,
          previous?.activeDevices ?? 0,
        ),
      },
    ] satisfies readonly DashboardMetric[];
  }

  const topDevice = [...current.deviceConsumption].sort(
    (first, second) => second.consumptionKwh - first.consumptionKwh,
  )[0];
  const previousTopDevice = previous?.deviceConsumption.find(
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
        previous ? previousTotal / previous.daysCount : 0,
      ),
    },
    {
      id: "estimatedCost",
      title: "Custo estimado",
      value: estimatedCost,
      format: "currency",
      description: "Tarifa simulada de R$ 0,84/kWh",
      comparison: estimatedCostComparison,
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

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getDashboard(query: DashboardQuery): Promise<DashboardViewData> {
    const { period, compare } = query;
    const definition = getPeriodDefinition(period);
    const currentPromise = this.repository.getDataset(
      definition.currentDatasetId,
    );
    const previousPromise = compare
      ? this.repository.getDataset(definition.previousDatasetId)
      : Promise.resolve(undefined);
    const [current, previous] = await Promise.all([
      currentPromise,
      previousPromise,
    ]);
    const temporalAnalysis = analyzeEnergyUsage(
      current,
      definition,
      previous,
    );
    const deviceAnalysis = analyzeDeviceConsumption(
      current.deviceConsumption,
      previous?.deviceConsumption,
      definition.comparisonLabel,
    );

    return {
      period,
      compare,
      definition,
      currentLabel: current.label,
      previousLabel: previous?.label,
      metrics: buildMetrics(
        period,
        compare,
        definition,
        current,
        previous,
      ),
      temporalAnalysis,
      deviceAnalysis,
      alerts: generateDashboardAlerts({
        period,
        currentLabel: current.label,
        temporalAnalysis,
        deviceAnalysis,
      }),
      timeline: buildDashboardTimeline(
        current.recentActivities,
        period,
        current.label,
      ),
      activities: current.recentActivities.slice(0, 5),
      transitionKey: `${period}-${compare ? "comparison" : "current"}`,
    };
  }
}

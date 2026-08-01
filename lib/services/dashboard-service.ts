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
  buildPeriodEnergyAnalysis,
  type HistoricalDashboardPeriod,
  type PeriodEnergyAnalysis,
} from "@/lib/dashboard/period-efficiency";
import { formatMetricNumber } from "@/lib/dashboard/formatters";
import {
  buildTodayDeviceAnalysis,
  buildTodayTemporalAnalysis,
} from "@/lib/dashboard/today-dashboard";
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
import { buildEnergyAnalysis } from "@/lib/energy/advisor/energy-advisor";
import type {
  EnergyAdvisorAlert,
  EnergyAnalysis,
} from "@/lib/energy/advisor/energy-advisor.types";
import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";
import { resolveEffectiveEnergyTariff } from "@/lib/energy/energy-tariff";
import { buildTodayEnergySnapshot } from "@/lib/energy/energy-engine";
import type { TodayEnergySnapshot } from "@/lib/energy/energy-engine.types";
import { normalizeMonetaryValue } from "@/lib/energy/energy-engine.utils";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";
import type { DashboardQuery } from "@/lib/schemas/dashboard-query-schema";
import type { DeviceService } from "@/lib/services/device-service";

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
    absoluteChange: normalizeMonetaryValue(
      Math.abs(comparison.absoluteChange),
    ) * Math.sign(comparison.absoluteChange),
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
  deviceDataSource: "registered-estimate" | "simulated-snapshot";
  comparisonDataSource?: "simulated-snapshot";
  todaySnapshot?: TodayEnergySnapshot;
  energyAnalysis?: EnergyAnalysis;
  periodEnergyAnalysis?: PeriodEnergyAnalysis;
  transitionKey: string;
};

function mapAdvisorAlert(
  alert: EnergyAdvisorAlert,
): DashboardAlert {
  return {
    id: alert.id,
    severity: alert.severity,
    category: alert.category,
    title: alert.title,
    description: alert.description,
    createdAt: "Hoje (estimado)",
    source: "advisor",
    dataOrigin: alert.dataOrigin,
    evidence: alert.evidence,
    recommendationId: alert.recommendationId,
  };
}

function buildTodayMetrics(
  snapshot: TodayEnergySnapshot,
  compare: boolean,
  definition: DashboardPeriodDefinition,
  tariffBrlPerKwh: number,
  previous?: DashboardDataset,
) {
  const previousTotal = previous ? sumEnergy(previous.energyUsage) : 0;
  const previousEstimatedCost = normalizeMonetaryValue(
    previousTotal * tariffBrlPerKwh,
  );
  const consumptionComparison =
    compare && previous
      ? compareNumbers(
          snapshot.totalConsumptionKwh,
          previousTotal,
          definition.comparisonLabel,
        )
      : undefined;
  const costComparison =
    compare && previous
      ? compareMonetaryValues(
          snapshot.estimatedDailyCost,
          previousEstimatedCost,
          definition.comparisonLabel,
        )
      : undefined;

  return [
    {
      id: "periodConsumption",
      title: "Consumo estimado hoje",
      value: snapshot.totalConsumptionKwh,
      format: "energy",
      description: "Soma dos dispositivos ativos cadastrados",
      comparison: consumptionComparison,
    },
    {
      id: "estimatedCost",
      title: "Custo diário estimado",
      value: snapshot.estimatedDailyCost,
      format: "currency",
      description: `Tarifa configurada de ${formatMetricNumber(tariffBrlPerKwh, "currency").value}/kWh`,
      comparison: costComparison,
    },
    {
      id: "monthlyConsumption",
      title: "Projeção mensal",
      value: snapshot.estimatedMonthlyConsumptionKwh,
      format: "energy",
      description: "Estimativa de 30 dias no mesmo perfil",
    },
    {
      id: "activeDevices",
      title: "Dispositivos ativos",
      value: snapshot.activeDeviceCount,
      format: "integer",
      description: "Ativos no cadastro persistente",
    },
  ] satisfies readonly DashboardMetric[];
}

function buildHistoricalMetrics(
  compare: boolean,
  definition: DashboardPeriodDefinition,
  current: DashboardDataset,
  tariffBrlPerKwh: number,
  previous?: DashboardDataset,
) {
  const total = sumEnergy(current.energyUsage);
  const previousTotal = previous ? sumEnergy(previous.energyUsage) : 0;
  const estimatedCost = normalizeMonetaryValue(
    total * tariffBrlPerKwh,
  );
  const previousEstimatedCost = normalizeMonetaryValue(
    previousTotal * tariffBrlPerKwh,
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
  const topDevice = current.deviceConsumption.toSorted(
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
      description: `Tarifa configurada de ${formatMetricNumber(tariffBrlPerKwh, "currency").value}/kWh`,
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
  constructor(
    private readonly repository: DashboardRepository,
    private readonly deviceService: Pick<DeviceService, "listDevices">,
  ) {}

  async getDashboard(
    query: DashboardQuery,
    tariffBrlPerKwh = DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
  ): Promise<DashboardViewData> {
    const effectiveTariff =
      resolveEffectiveEnergyTariff(tariffBrlPerKwh);

    if (query.period === "today") {
      return this.getTodayDashboard(query, effectiveTariff);
    }

    return this.getHistoricalDashboard({
      ...query,
      period: query.period,
    }, effectiveTariff);
  }

  private async getTodayDashboard(
    query: DashboardQuery,
    tariffBrlPerKwh: number,
  ): Promise<DashboardViewData> {
    const definition = getPeriodDefinition("today");
    const activityDatasetPromise = this.repository.getDataset(
      definition.currentDatasetId,
    );
    const previousPromise = query.compare
      ? this.repository.getDataset(definition.previousDatasetId)
      : Promise.resolve(undefined);
    const [devices, activityDataset, previous] = await Promise.all([
      this.deviceService.listDevices(),
      activityDatasetPromise,
      previousPromise,
    ]);
    const snapshot = buildTodayEnergySnapshot(
      devices,
      tariffBrlPerKwh,
    );
    const energyAnalysis = buildEnergyAnalysis(snapshot, {
      tariffBrlPerKwh,
    });
    const temporalAnalysis = buildTodayTemporalAnalysis(
      snapshot,
      definition,
      previous,
    );
    const deviceAnalysis = buildTodayDeviceAnalysis(snapshot);
    const currentLabel = "Hoje (estimado)";

    return {
      period: "today",
      compare: query.compare,
      definition,
      currentLabel,
      previousLabel: previous
        ? `${previous.label} (simulado)`
        : undefined,
      metrics: buildTodayMetrics(
        snapshot,
        query.compare,
        definition,
        tariffBrlPerKwh,
        previous,
      ),
      temporalAnalysis,
      deviceAnalysis,
      alerts: energyAnalysis.alerts.map(mapAdvisorAlert),
      timeline: buildDashboardTimeline(
        activityDataset.recentActivities,
        "today",
        activityDataset.label,
      ),
      activities: activityDataset.recentActivities.slice(0, 5),
      deviceDataSource: "registered-estimate",
      comparisonDataSource: previous
        ? "simulated-snapshot"
        : undefined,
      todaySnapshot: snapshot,
      energyAnalysis,
      transitionKey: `today-${query.compare ? "comparison" : "current"}`,
    };
  }

  private async getHistoricalDashboard(
    query: DashboardQuery & {
      period: HistoricalDashboardPeriod;
    },
    tariffBrlPerKwh: number,
  ): Promise<DashboardViewData> {
    const definition = getPeriodDefinition(query.period);
    const currentPromise = this.repository.getDataset(
      definition.currentDatasetId,
    );
    const previousPromise = this.repository.getDataset(
      definition.previousDatasetId,
    );
    const [current, previous] = await Promise.all([
      currentPromise,
      previousPromise,
    ]);
    const visiblePrevious = query.compare ? previous : undefined;
    const temporalAnalysis = analyzeEnergyUsage(
      current,
      definition,
      visiblePrevious,
    );
    const deviceAnalysis = analyzeDeviceConsumption(
      current.deviceConsumption,
      visiblePrevious?.deviceConsumption,
      definition.comparisonLabel,
    );
    const periodEnergyAnalysis = buildPeriodEnergyAnalysis(
      query.period,
      current,
      previous,
    );

    return {
      period: query.period,
      compare: query.compare,
      definition,
      currentLabel: current.label,
      previousLabel: visiblePrevious?.label,
      metrics: buildHistoricalMetrics(
        query.compare,
        definition,
        current,
        tariffBrlPerKwh,
        visiblePrevious,
      ),
      temporalAnalysis,
      deviceAnalysis,
      alerts: generateDashboardAlerts({
        period: query.period,
        currentLabel: current.label,
        temporalAnalysis,
        deviceAnalysis,
      }),
      timeline: buildDashboardTimeline(
        current.recentActivities,
        query.period,
        current.label,
      ),
      activities: current.recentActivities.slice(0, 5),
      deviceDataSource: "simulated-snapshot",
      comparisonDataSource: visiblePrevious
        ? "simulated-snapshot"
        : undefined,
      periodEnergyAnalysis,
      transitionKey: `${query.period}-${query.compare ? "comparison" : "current"}`,
    };
  }
}

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
  DashboardDataMode,
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
  mode: DashboardDataMode;
  dataOrigin: "user-devices" | "global-demo";
  period: DashboardPeriod;
  compare: boolean;
  historyAvailable: boolean;
  comparisonAvailable: boolean;
  emptyState:
    | {
        kind: "no-devices" | "historical-unavailable";
        title: string;
        description: string;
        supportingText?: string;
      }
    | null;
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
    userId: string,
    tariffBrlPerKwh = DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
  ): Promise<DashboardViewData> {
    const effectiveTariff =
      resolveEffectiveEnergyTariff(tariffBrlPerKwh);

    if (query.mode === "demo") {
      return this.getDemoDashboard(query, effectiveTariff);
    }

    if (query.period !== "today") {
      return this.getUnavailableHomeHistory(query.period);
    }

    return this.getHomeTodayDashboard(userId, effectiveTariff);
  }

  private async getHomeTodayDashboard(
    userId: string,
    tariffBrlPerKwh: number,
  ): Promise<DashboardViewData> {
    const definition = getPeriodDefinition("today");
    const devices = await this.deviceService.listDevices(userId);
    const snapshot = buildTodayEnergySnapshot(
      devices,
      tariffBrlPerKwh,
    );
    const hasDevices = devices.length > 0;
    const energyAnalysis = hasDevices
      ? buildEnergyAnalysis(snapshot, { tariffBrlPerKwh })
      : undefined;
    const temporalAnalysis = hasDevices
      ? buildTodayTemporalAnalysis(snapshot, definition)
      : createEmptyTemporalAnalysis();
    const deviceAnalysis = hasDevices
      ? buildTodayDeviceAnalysis(snapshot)
      : createEmptyDeviceAnalysis();
    const currentLabel = "Hoje (estimado)";

    return {
      mode: "home",
      dataOrigin: "user-devices",
      period: "today",
      compare: false,
      historyAvailable: false,
      comparisonAvailable: false,
      emptyState: hasDevices
        ? null
        : {
            kind: "no-devices",
            title: "Comece cadastrando seu primeiro dispositivo",
            description:
              "Adicione os equipamentos da sua residência para gerar estimativas de consumo, custo e recomendações.",
          },
      definition,
      currentLabel,
      metrics: buildTodayMetrics(
        snapshot,
        false,
        definition,
        tariffBrlPerKwh,
      ),
      temporalAnalysis,
      deviceAnalysis,
      alerts: energyAnalysis?.alerts.map(mapAdvisorAlert) ?? [],
      timeline: buildDashboardTimeline([], "today", currentLabel),
      activities: [],
      deviceDataSource: "registered-estimate",
      todaySnapshot: snapshot,
      energyAnalysis,
      transitionKey: "home-today-current",
    };
  }

  private getUnavailableHomeHistory(
    period: HistoricalDashboardPeriod,
  ): DashboardViewData {
    const definition = getPeriodDefinition(period);

    return {
      mode: "home",
      dataOrigin: "user-devices",
      period,
      compare: false,
      historyAvailable: false,
      comparisonAvailable: false,
      emptyState: {
        kind: "historical-unavailable",
        title:
          "Ainda não existem medições históricas para esta residência.",
        description:
          "O histórico começará a ser exibido quando a integração de medições estiver disponível.",
      },
      definition,
      currentLabel: `${definition.label} (indisponível)`,
      metrics: [],
      temporalAnalysis: createEmptyTemporalAnalysis(),
      deviceAnalysis: createEmptyDeviceAnalysis(),
      alerts: [],
      timeline: buildDashboardTimeline([], period, definition.label),
      activities: [],
      deviceDataSource: "registered-estimate",
      transitionKey: `home-${period}-unavailable`,
    };
  }

  private async getDemoDashboard(
    query: DashboardQuery,
    tariffBrlPerKwh: number,
  ): Promise<DashboardViewData> {
    const definition = getPeriodDefinition(query.period);
    const currentPromise = this.repository.getDataset(
      definition.currentDatasetId,
    );
    const needsPrevious = query.compare || query.period !== "today";
    const previousPromise = needsPrevious
      ? this.repository.getDataset(definition.previousDatasetId)
      : Promise.resolve(undefined);
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
    const periodEnergyAnalysis =
      query.period !== "today" && previous
        ? buildPeriodEnergyAnalysis(query.period, current, previous)
        : undefined;

    return {
      mode: "demo",
      dataOrigin: "global-demo",
      period: query.period,
      compare: query.compare,
      historyAvailable: true,
      comparisonAvailable: true,
      emptyState: null,
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
      periodEnergyAnalysis,
      transitionKey: `demo-${query.period}-${query.compare ? "comparison" : "current"}`,
    };
  }
}

function createEmptyTemporalAnalysis(): EnergyUsageAnalysis {
  return {
    points: [],
    totalKwh: 0,
    averageKwh: 0,
    peak: null,
    minimum: null,
    insights: [],
  };
}

function createEmptyDeviceAnalysis(): DeviceConsumptionAnalysis {
  return {
    items: [],
    totalKwh: 0,
    insights: [],
  };
}

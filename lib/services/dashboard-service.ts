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
import {
  formatCalendarDateKey,
  isWeekendCalendarDate,
} from "@/lib/history-calendar";
import type {
  DailyEnergySnapshotRecord,
  EnergyHistoryCoverage,
  EnergyHistoryPeriod,
} from "@/lib/history-types";
import { getPeriodDefinition } from "@/lib/dashboard/periods";
import {
  buildPeriodEnergyAnalysis,
  type HistoricalDashboardPeriod,
  type PeriodEnergyAnalysis,
} from "@/lib/dashboard/period-efficiency";
import {
  formatChartEnergy,
  formatMetricNumber,
} from "@/lib/dashboard/formatters";
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
import type { EnergyHistoryService } from "@/lib/services/energy-history-service";

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
  historyCoverage?: EnergyHistoryCoverage;
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
  previous?: DailyEnergySnapshotRecord,
) {
  const previousTotal = previous?.totalConsumptionKwh ?? 0;
  const previousEstimatedCost = previous?.estimatedCost ?? 0;
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
      comparison:
        compare && previous
          ? compareNumbers(
              snapshot.activeDeviceCount,
              previous.activeDeviceCount,
              definition.comparisonLabel,
            )
          : undefined,
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

type EstimatedHistoryDataset = DashboardDataset & {
  estimatedCost: number;
};

function getHomePeriodDefinition(
  period: DashboardPeriod,
): DashboardPeriodDefinition {
  const definition = getPeriodDefinition(period);

  return {
    ...definition,
    comparisonLabel:
      period === "today" ? "ontem" : definition.comparisonLabel,
    chartDescription:
      period === "today"
        ? "Curva estimada dos dispositivos ativos em intervalos de duas horas"
        : "Histórico diário estimado a partir dos dispositivos cadastrados",
  };
}

function buildEstimatedHistoryDataset(
  id: DashboardDataset["id"],
  label: string,
  snapshots: readonly DailyEnergySnapshotRecord[],
): EstimatedHistoryDataset {
  const devices = new Map<
    string,
    {
      id: string;
      device: string;
      description: string;
      consumptionKwh: number;
    }
  >();

  for (const snapshot of snapshots) {
    for (const device of snapshot.devices) {
      const current = devices.get(device.deviceId);
      devices.set(device.deviceId, {
        id: device.deviceId,
        device: device.deviceNameSnapshot,
        description:
          "Estimativa acumulada no histórico persistido.",
        consumptionKwh:
          (current?.consumptionKwh ?? 0) +
          device.estimatedConsumptionKwh,
      });
    }
  }

  const latest = snapshots.at(-1);
  const firstDate = snapshots[0]?.snapshotDate;
  const lastDate = latest?.snapshotDate;

  return {
    id,
    label,
    rangeLabel:
      firstDate && lastDate
        ? `${formatCalendarDateKey(firstDate)} a ${formatCalendarDateKey(lastDate)}`
        : "Sem histórico estimado disponível",
    daysCount: snapshots.length,
    granularity: "day",
    activeDevices: latest?.activeDeviceCount ?? 0,
    energyUsage: snapshots.map((snapshot) => {
      const formattedDate = formatCalendarDateKey(
        snapshot.snapshotDate,
      );

      return {
        id: snapshot.snapshotDate,
        label: formattedDate,
        shortLabel: formattedDate.slice(0, 5),
        consumptionKwh: snapshot.totalConsumptionKwh,
        isWeekend: isWeekendCalendarDate(snapshot.snapshotDate),
      };
    }),
    deviceConsumption: [...devices.values()]
      .filter((device) => device.consumptionKwh > 0)
      .toSorted(
        (first, second) =>
          second.consumptionKwh - first.consumptionKwh ||
          first.device.localeCompare(second.device, "pt-BR") ||
          first.id.localeCompare(second.id),
      ),
    recentActivities: snapshots
      .toReversed()
      .map((snapshot) => ({
        id: `estimated-history-${snapshot.id}`,
        device: "Residência",
        event: "Estimativa diária registrada no histórico",
        occurredAt: formatCalendarDateKey(snapshot.snapshotDate),
        occurredAtIso: snapshot.updatedAt.toISOString(),
        status: "completed" as const,
      })),
    estimatedCost: snapshots.reduce(
      (total, snapshot) => total + snapshot.estimatedCost,
      0,
    ),
  };
}

function buildEstimatedHistoricalMetrics(
  compare: boolean,
  definition: DashboardPeriodDefinition,
  current: EstimatedHistoryDataset,
  previous?: EstimatedHistoryDataset,
) {
  const total = sumEnergy(current.energyUsage);
  const previousTotal = previous ? sumEnergy(previous.energyUsage) : 0;
  const comparison = (currentValue: number, previousValue: number) =>
    compare && previous
      ? compareNumbers(
          currentValue,
          previousValue,
          definition.comparisonLabel,
        )
      : undefined;
  const topDevice = current.deviceConsumption[0];
  const previousTopDevice = topDevice
    ? previous?.deviceConsumption.find(
        (device) => device.id === topDevice.id,
      )
    : undefined;
  const metrics: DashboardMetric[] = [
    {
      id: "periodConsumption",
      title: "Consumo estimado no período",
      value: total,
      format: "energy",
      description: `${current.daysCount} ${current.daysCount === 1 ? "dia disponível" : "dias disponíveis"} no histórico estimado`,
      comparison: comparison(total, previousTotal),
    },
    {
      id: "dailyAverage",
      title: "Média diária estimada",
      value: current.daysCount === 0 ? 0 : total / current.daysCount,
      format: "energy",
      description: "Média somente dos dias com snapshot disponível",
      comparison: comparison(
        current.daysCount === 0 ? 0 : total / current.daysCount,
        previous && previous.daysCount > 0
          ? previousTotal / previous.daysCount
          : 0,
      ),
    },
    {
      id: "estimatedCost",
      title: "Custo histórico estimado",
      value: current.estimatedCost,
      format: "currency",
      description: "Soma calculada com a tarifa armazenada em cada dia",
      comparison: comparison(
        current.estimatedCost,
        previous?.estimatedCost ?? 0,
      ),
    },
  ];

  if (topDevice) {
    metrics.push({
      id: "topDevice",
      title: "Maior consumo estimado",
      value: topDevice.consumptionKwh,
      format: "energy",
      description: topDevice.device,
      comparison: comparison(
        topDevice.consumptionKwh,
        previousTopDevice?.consumptionKwh ?? 0,
      ),
    });
  }

  return metrics;
}

function addTodayAggregateComparison(
  analysis: EnergyUsageAnalysis,
  snapshot: TodayEnergySnapshot,
  previous: DailyEnergySnapshotRecord,
  previousLabel: string,
): EnergyUsageAnalysis {
  const overallComparison = compareNumbers(
    snapshot.totalConsumptionKwh,
    previous.totalConsumptionKwh,
    previousLabel,
  );

  return {
    ...analysis,
    previousTotalKwh: previous.totalConsumptionKwh,
    overallComparison,
    insights: [
      {
        id: "persisted-day-comparison",
        title: overallComparison.message,
        description: `${formatChartEnergy(snapshot.totalConsumptionKwh)} estimados hoje, ante ${formatChartEnergy(previous.totalConsumptionKwh)} no histórico estimado de ontem.`,
        tone:
          overallComparison.significance === "relevant"
            ? "attention"
            : overallComparison.significance === "moderate"
              ? "brand"
              : "neutral",
      },
      ...analysis.insights,
    ],
  };
}

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly deviceService: Pick<DeviceService, "listDevices">,
    private readonly historyService?: Pick<
      EnergyHistoryService,
      "captureCurrentDay" | "getPeriod"
    >,
    private readonly clock: () => Date = () => new Date(),
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

    return this.getHomeDashboard(query, userId, effectiveTariff);
  }

  private async getHomeDashboard(
    query: DashboardQuery,
    userId: string,
    tariffBrlPerKwh: number,
  ): Promise<DashboardViewData> {
    const devices = await this.deviceService.listDevices(userId);
    const instant = this.clock();
    const history = await this.loadHomeHistory(
      userId,
      devices,
      tariffBrlPerKwh,
      query.period,
      instant,
    );

    if (query.period !== "today") {
      return history && history.current.length > 0
        ? this.getHomeHistoricalDashboard(query, history)
        : this.getUnavailableHomeHistory(query.period, history?.coverage);
    }

    return this.getHomeTodayDashboard(
      query,
      devices,
      tariffBrlPerKwh,
      history,
    );
  }

  private getHomeTodayDashboard(
    query: DashboardQuery,
    devices: Awaited<ReturnType<DeviceService["listDevices"]>>,
    tariffBrlPerKwh: number,
    history?: EnergyHistoryPeriod,
  ): DashboardViewData {
    const definition = getHomePeriodDefinition("today");
    const snapshot = buildTodayEnergySnapshot(
      devices,
      tariffBrlPerKwh,
    );
    const hasDevices = devices.length > 0;
    const comparisonAvailable =
      history?.coverage.comparisonAvailable ?? false;
    const compare = query.compare && comparisonAvailable;
    const previous = compare ? history?.previous[0] : undefined;
    const energyAnalysis = hasDevices
      ? buildEnergyAnalysis(snapshot, { tariffBrlPerKwh })
      : undefined;
    const baseTemporalAnalysis = hasDevices
      ? buildTodayTemporalAnalysis(snapshot, definition)
      : createEmptyTemporalAnalysis();
    const temporalAnalysis = previous
      ? addTodayAggregateComparison(
          baseTemporalAnalysis,
          snapshot,
          previous,
          definition.comparisonLabel,
        )
      : baseTemporalAnalysis;
    const currentDeviceConsumption = snapshot.distribution.map(
      (device) => ({
        id: device.deviceId,
        device: device.name,
        description: `Estimativa atual para ${device.category.toLocaleLowerCase("pt-BR")}.`,
        consumptionKwh: device.consumptionKwh,
      }),
    );
    const previousDeviceConsumption = previous?.devices.map(
      (device) => ({
        id: device.deviceId,
        device: device.deviceNameSnapshot,
        description: "Estimativa armazenada no histórico de ontem.",
        consumptionKwh: device.estimatedConsumptionKwh,
      }),
    );
    const deviceAnalysis =
      hasDevices && previous
        ? analyzeDeviceConsumption(
            currentDeviceConsumption,
            previousDeviceConsumption,
            definition.comparisonLabel,
          )
        : hasDevices
          ? buildTodayDeviceAnalysis(snapshot)
      : createEmptyDeviceAnalysis();
    const currentLabel = "Hoje (estimado)";
    const currentHistoryDataset = history
      ? buildEstimatedHistoryDataset(
          definition.currentDatasetId,
          currentLabel,
          history.current,
        )
      : undefined;

    return {
      mode: "home",
      dataOrigin: "user-devices",
      period: "today",
      compare,
      historyAvailable:
        (history?.coverage.currentAvailableDays ?? 0) > 0,
      comparisonAvailable,
      historyCoverage: history?.coverage,
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
      previousLabel: previous
        ? "Ontem (histórico estimado)"
        : undefined,
      metrics: buildTodayMetrics(
        snapshot,
        compare,
        definition,
        tariffBrlPerKwh,
        previous,
      ),
      temporalAnalysis,
      deviceAnalysis,
      alerts: energyAnalysis?.alerts.map(mapAdvisorAlert) ?? [],
      timeline: buildDashboardTimeline(
        currentHistoryDataset?.recentActivities ?? [],
        "today",
        currentLabel,
      ),
      activities:
        currentHistoryDataset?.recentActivities.slice(0, 5) ?? [],
      deviceDataSource: "registered-estimate",
      todaySnapshot: snapshot,
      energyAnalysis,
      transitionKey: `home-today-${compare ? "comparison" : "current"}`,
    };
  }

  private getUnavailableHomeHistory(
    period: HistoricalDashboardPeriod,
    coverage?: EnergyHistoryCoverage,
  ): DashboardViewData {
    const definition = getHomePeriodDefinition(period);

    return {
      mode: "home",
      dataOrigin: "user-devices",
      period,
      compare: false,
      historyAvailable: false,
      comparisonAvailable: false,
      historyCoverage: coverage,
      emptyState: {
        kind: "historical-unavailable",
        title:
          "Ainda não há histórico estimado neste período.",
        description:
          "Acesse a dashboard em dias diferentes para formar o histórico baseado nos dispositivos cadastrados.",
        supportingText:
          "Dias sem snapshot permanecem ausentes e nunca são tratados como consumo zero.",
      },
      definition,
      currentLabel: `${definition.label} (sem histórico estimado)`,
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

  private getHomeHistoricalDashboard(
    query: DashboardQuery,
    history: EnergyHistoryPeriod,
  ): DashboardViewData {
    const period = query.period as HistoricalDashboardPeriod;
    const definition = getHomePeriodDefinition(period);
    const partialSuffix = history.coverage.currentComplete
      ? ""
      : ` (${history.coverage.currentAvailableDays}/${history.coverage.expectedDays} dias disponíveis)`;
    const currentLabel = `${definition.label} — histórico estimado${partialSuffix}`;
    const current = buildEstimatedHistoryDataset(
      definition.currentDatasetId,
      currentLabel,
      history.current,
    );
    const comparisonAvailable = history.coverage.comparisonAvailable;
    const compare = query.compare && comparisonAvailable;
    const previous = compare
      ? buildEstimatedHistoryDataset(
          definition.previousDatasetId,
          `${definition.comparisonLabel} — histórico estimado`,
          history.previous,
        )
      : undefined;
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
    const alerts = generateDashboardAlerts({
      period,
      currentLabel,
      temporalAnalysis,
      deviceAnalysis,
    }).map((alert) => ({ ...alert, dataOrigin: "estimated" as const }));
    const periodEnergyAnalysis =
      compare && previous
        ? buildPeriodEnergyAnalysis(
            period,
            current,
            previous,
            "estimated",
          )
        : undefined;

    return {
      mode: "home",
      dataOrigin: "user-devices",
      period,
      compare,
      historyAvailable: true,
      comparisonAvailable,
      historyCoverage: history.coverage,
      emptyState: null,
      definition,
      currentLabel,
      previousLabel: previous?.label,
      metrics: buildEstimatedHistoricalMetrics(
        compare,
        definition,
        current,
        previous,
      ),
      temporalAnalysis,
      deviceAnalysis,
      alerts,
      timeline: buildDashboardTimeline(
        current.recentActivities,
        period,
        currentLabel,
      ),
      activities: current.recentActivities.slice(0, 5),
      deviceDataSource: "registered-estimate",
      periodEnergyAnalysis,
      transitionKey: `home-${period}-${compare ? "comparison" : history.coverage.currentComplete ? "complete" : "partial"}`,
    };
  }

  private async loadHomeHistory(
    userId: string,
    devices: Awaited<ReturnType<DeviceService["listDevices"]>>,
    tariffBrlPerKwh: number,
    period: DashboardPeriod,
    instant: Date,
  ) {
    if (!this.historyService) {
      return undefined;
    }

    try {
      await this.historyService.captureCurrentDay(
        userId,
        devices,
        tariffBrlPerKwh,
        instant,
      );
    } catch (error) {
      this.reportHistoryFailure("write", error);
    }

    try {
      return await this.historyService.getPeriod(
        userId,
        period,
        instant,
      );
    } catch (error) {
      this.reportHistoryFailure("read", error);
      return undefined;
    }
  }

  private reportHistoryFailure(
    stage: "write" | "read",
    error: unknown,
  ) {
    console.error("Energy history operation failed.", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
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

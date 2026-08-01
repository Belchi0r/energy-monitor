import { describe, expect, it } from "vitest";

import { dashboardDatasets } from "@/lib/dashboard/datasets";
import type {
  DashboardDataset,
  DashboardDatasetId,
  DashboardPeriod,
  MetricId,
} from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";
import { normalizeMonetaryValue } from "@/lib/energy/energy-engine.utils";
import { DashboardService } from "@/lib/services/dashboard-service";
import { DeviceService } from "@/lib/services/device-service";
import {
  createDemoDeviceRecords,
  InMemoryDeviceRepository,
} from "@/tests/device-test-helpers";

type ServiceScenario = {
  period: DashboardPeriod;
  currentDatasetId: DashboardDatasetId;
  previousDatasetId: DashboardDatasetId;
  metricIds: readonly MetricId[];
  currentCost: number;
  previousCost: number;
  costChange: number;
};

const scenarios = [
  {
    period: "today",
    currentDatasetId: "today",
    previousDatasetId: "yesterday",
    metricIds: [
      "periodConsumption",
      "estimatedCost",
      "monthlyConsumption",
      "activeDevices",
    ],
    currentCost: 7.3,
    previousCost: 6.47,
    costChange: 0.83,
  },
  {
    period: "7d",
    currentDatasetId: "last7Days",
    previousDatasetId: "previous7Days",
    metricIds: [
      "periodConsumption",
      "dailyAverage",
      "estimatedCost",
      "topDevice",
    ],
    currentCost: 51.58,
    previousCost: 47.8,
    costChange: 3.78,
  },
  {
    period: "30d",
    currentDatasetId: "last30Days",
    previousDatasetId: "previous30Days",
    metricIds: [
      "periodConsumption",
      "dailyAverage",
      "estimatedCost",
      "topDevice",
    ],
    currentCost: 216.55,
    previousCost: 213.53,
    costChange: 3.02,
  },
] as const satisfies readonly ServiceScenario[];

class RecordingDashboardRepository implements DashboardRepository {
  readonly calls: DashboardDatasetId[] = [];

  constructor(
    private readonly datasets: Readonly<
      Record<DashboardDatasetId, DashboardDataset>
    > = dashboardDatasets,
  ) {}

  async getDataset(id: DashboardDatasetId) {
    this.calls.push(id);
    return this.datasets[id];
  }
}

function createSubject() {
  const repository = new RecordingDashboardRepository();

  return {
    repository,
    service: new DashboardService(
      repository,
      new DeviceService(new InMemoryDeviceRepository()),
    ),
  };
}

describe("DashboardService", () => {
  it.each(scenarios)(
    "monta $period sem expor comparação quando desligada",
    async (scenario) => {
      const { repository, service } = createSubject();

      const result = await service.getDashboard({
        period: scenario.period,
        compare: false,
      });

      expect(result.period).toBe(scenario.period);
      expect(result.compare).toBe(false);
      expect(result.definition.currentDatasetId).toBe(
        scenario.currentDatasetId,
      );
      expect(result.definition.previousDatasetId).toBe(
        scenario.previousDatasetId,
      );
      expect(result.metrics.map((metric) => metric.id)).toEqual(
        scenario.metricIds,
      );
      expect(
        result.metrics.every((metric) => metric.comparison === undefined),
      ).toBe(true);
      expect(result.previousLabel).toBeUndefined();
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.timeline.items).toHaveLength(8);
      expect(result.activities).toHaveLength(5);
      expect(result.transitionKey).toBe(`${scenario.period}-current`);
      expect(repository.calls).toEqual(
        scenario.period === "today"
          ? [scenario.currentDatasetId]
          : [
              scenario.currentDatasetId,
              scenario.previousDatasetId,
            ],
      );
      expect(
        scenario.period === "today"
          ? result.periodEnergyAnalysis
          : result.periodEnergyAnalysis?.dataOrigin,
      ).toBe(
        scenario.period === "today" ? undefined : "simulated",
      );
    },
  );

  it.each(scenarios)(
    "monta $period com comparação e os datasets esperados",
    async (scenario) => {
      const { repository, service } = createSubject();

      const result = await service.getDashboard({
        period: scenario.period,
        compare: true,
      });

      expect(result.compare).toBe(true);
      expect(result.previousLabel).toBeDefined();
      expect(
        result.metrics
          .filter(
            (metric) =>
              !(
                scenario.period === "today" &&
                (metric.id === "activeDevices" ||
                  metric.id === "monthlyConsumption")
              ),
          )
          .every((metric) => metric.comparison !== undefined),
      ).toBe(true);
      expect(
        scenario.period === "today"
          ? result.alerts.every(
              (alert) =>
                alert.source === "advisor" &&
                alert.dataOrigin === "estimated",
            )
          : result.alerts.some(
              (alert) => alert.category === "comparison",
            ),
      ).toBe(true);
      expect(result.timeline.items).toHaveLength(8);
      expect(result.activities).toEqual(
        dashboardDatasets[scenario.currentDatasetId].recentActivities.slice(
          0,
          5,
        ),
      );
      expect(result.transitionKey).toBe(
        `${scenario.period}-comparison`,
      );
      expect(repository.calls).toEqual([
        scenario.currentDatasetId,
        scenario.previousDatasetId,
      ]);
    },
  );

  it.each(scenarios)(
    "normaliza todos os valores monetários observáveis em $period",
    async (scenario) => {
      const { service } = createSubject();

      const result = await service.getDashboard({
        period: scenario.period,
        compare: true,
      });
      const costMetric = result.metrics.find(
        (metric) => metric.id === "estimatedCost",
      );

      expect(costMetric).toBeDefined();
      expect(costMetric?.value).toBe(scenario.currentCost);
      expect(costMetric?.comparison?.previousValue).toBe(
        scenario.previousCost,
      );
      expect(costMetric?.comparison?.absoluteChange).toBe(
        scenario.costChange,
      );

      const monetaryValues = [
        costMetric?.value,
        costMetric?.comparison?.previousValue,
        costMetric?.comparison?.absoluteChange,
      ];
      expect(
        monetaryValues.every(
          (value) =>
            value !== undefined &&
            Number.isInteger(value * 100),
        ),
      ).toBe(true);
    },
  );

  it("não altera nenhum dataset durante as análises", async () => {
    const originalDatasets = structuredClone(dashboardDatasets);
    const { service } = createSubject();

    for (const scenario of scenarios) {
      await service.getDashboard({
        period: scenario.period,
        compare: true,
      });
    }

    expect(dashboardDatasets).toEqual(originalDatasets);
  });

  it("usa o cadastro persistente somente na distribuição atual", async () => {
    const { service } = createSubject();

    const today = await service.getDashboard({
      period: "today",
      compare: true,
    });
    const history = await service.getDashboard({
      period: "7d",
      compare: true,
    });

    expect(today.deviceDataSource).toBe("registered-estimate");
    expect(today.deviceAnalysis.items).toHaveLength(5);
    expect(
      today.metrics.find((metric) => metric.id === "activeDevices")?.value,
    ).toBe(5);
    expect(
      today.deviceAnalysis.items.every(
        (item) => item.periodComparison === undefined,
      ),
    ).toBe(true);
    expect(today.todaySnapshot).toBeDefined();
    expect(today.temporalAnalysis.totalKwh).toBe(
      today.todaySnapshot?.totalConsumptionKwh,
    );
    expect(today.deviceAnalysis.totalKwh).toBe(
      today.todaySnapshot?.totalConsumptionKwh,
    );
    expect(
      today.metrics.find((metric) => metric.id === "periodConsumption")
        ?.value,
    ).toBe(today.todaySnapshot?.totalConsumptionKwh);
    expect(history.deviceDataSource).toBe("simulated-snapshot");
    expect(history.todaySnapshot).toBeUndefined();
    expect(
      history.deviceAnalysis.items.some(
        (item) => item.periodComparison !== undefined,
      ),
    ).toBe(true);
  });

  it("produz estado seguro quando não há dispositivos ativos", async () => {
    const repository = new RecordingDashboardRepository();
    const inactiveDevices = createDemoDeviceRecords().map((device) => ({
      ...device,
      status: "inactive" as const,
    }));
    const service = new DashboardService(
      repository,
      new DeviceService(
        new InMemoryDeviceRepository(inactiveDevices),
      ),
    );

    const result = await service.getDashboard({
      period: "today",
      compare: false,
    });

    expect(result.todaySnapshot?.totalConsumptionKwh).toBe(0);
    expect(result.deviceAnalysis.items).toEqual([]);
    expect(result.temporalAnalysis.peak).toBeNull();
    expect(result.temporalAnalysis.minimum).toBeNull();
    expect(result.alerts).toEqual([]);
    expect(
      result.metrics.find((metric) => metric.id === "estimatedCost")
        ?.value,
    ).toBe(0);
  });

  it("não cria insight de dois dispositivos quando somente um consome", async () => {
    const repository = new RecordingDashboardRepository();
    const [device] = createDemoDeviceRecords();
    const service = new DashboardService(
      repository,
      new DeviceService(
        new InMemoryDeviceRepository([device]),
      ),
    );

    const result = await service.getDashboard({
      period: "today",
      compare: false,
    });

    expect(result.deviceAnalysis.items).toHaveLength(1);
    expect(result.deviceAnalysis.items[0].percentage).toBe(1);
    expect(
      result.deviceAnalysis.insights.some(
        (insight) => insight.id === "top-two-concentration",
      ),
    ).toBe(false);
  });

  it.each([
    ["7d", 80],
    ["30d", 90],
  ] as const)(
    "integra score histórico em %s sem recomendações dos dispositivos atuais",
    async (period, expectedScore) => {
      const { service } = createSubject();
      const result = await service.getDashboard({
        period,
        compare: false,
      });

      expect(result.energyAnalysis).toBeUndefined();
      expect(result.todaySnapshot).toBeUndefined();
      expect(result.periodEnergyAnalysis).toEqual(
        expect.objectContaining({
          period,
          dataOrigin: "simulated",
        }),
      );
      expect(result.periodEnergyAnalysis?.summary.score).toBe(
        expectedScore,
      );
      expect(JSON.stringify(result.periodEnergyAnalysis)).not.toContain(
        "recommendations",
      );
    },
  );

  it("propaga a tarifa para Hoje e preserva consumo e score", async () => {
    const { service } = createSubject();
    const defaultTariff = await service.getDashboard(
      { period: "today", compare: true },
      0.84,
    );
    const customTariff = await service.getDashboard(
      { period: "today", compare: true },
      1,
    );
    const defaultCost = defaultTariff.metrics.find(
      (metric) => metric.id === "estimatedCost",
    );
    const customCost = customTariff.metrics.find(
      (metric) => metric.id === "estimatedCost",
    );
    const defaultAirConditioner =
      defaultTariff.energyAnalysis?.opportunities.find(
        (opportunity) =>
          opportunity.deviceName === "Ar-condicionado",
      );
    const customAirConditioner =
      customTariff.energyAnalysis?.opportunities.find(
        (opportunity) =>
          opportunity.deviceName === "Ar-condicionado",
      );

    expect(customCost?.value).toBe(
      customTariff.todaySnapshot?.totalConsumptionKwh,
    );
    expect(customCost?.value).not.toBe(defaultCost?.value);
    expect(
      customTariff.todaySnapshot?.estimatedMonthlyCost,
    ).not.toBe(defaultTariff.todaySnapshot?.estimatedMonthlyCost);
    expect(customAirConditioner?.savings.monthlyBrl).toBe(22.5);
    expect(defaultAirConditioner?.savings.monthlyBrl).toBe(18.9);
    expect(customTariff.todaySnapshot?.totalConsumptionKwh).toBe(
      defaultTariff.todaySnapshot?.totalConsumptionKwh,
    );
    expect(customTariff.energyAnalysis?.summary.score).toBe(
      defaultTariff.energyAnalysis?.summary.score,
    );
    expect(customTariff.temporalAnalysis).toEqual(
      defaultTariff.temporalAnalysis,
    );
    expect(customTariff.deviceAnalysis).toEqual(
      defaultTariff.deviceAnalysis,
    );
  });

  it.each(["7d", "30d"] as const)(
    "propaga a tarifa para o custo de %s sem alterar o score",
    async (period) => {
      const { service } = createSubject();
      const defaultTariff = await service.getDashboard(
        { period, compare: true },
        0.84,
      );
      const customTariff = await service.getDashboard(
        { period, compare: true },
        1,
      );
      const customCost = customTariff.metrics.find(
        (metric) => metric.id === "estimatedCost",
      );

      expect(customCost?.value).toBe(
        normalizeMonetaryValue(
          customTariff.temporalAnalysis.totalKwh,
        ),
      );
      expect(customCost?.value).not.toBe(
        defaultTariff.metrics.find(
          (metric) => metric.id === "estimatedCost",
        )?.value,
      );
      expect(customTariff.periodEnergyAnalysis?.summary.score).toBe(
        defaultTariff.periodEnergyAnalysis?.summary.score,
      );
      expect(customTariff.temporalAnalysis.totalKwh).toBe(
        defaultTariff.temporalAnalysis.totalKwh,
      );
    },
  );
});

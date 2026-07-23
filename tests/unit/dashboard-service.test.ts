import { describe, expect, it } from "vitest";

import { dashboardDatasets } from "@/lib/dashboard/datasets";
import type {
  DashboardDataset,
  DashboardDatasetId,
  DashboardPeriod,
  MetricId,
} from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";

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
      "currentPower",
      "periodConsumption",
      "estimatedCost",
      "activeDevices",
    ],
    currentCost: 7.31,
    previousCost: 6.47,
    costChange: 0.84,
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
    service: new DashboardService(repository),
  };
}

describe("DashboardService", () => {
  it.each(scenarios)(
    "monta $period sem carregar o dataset anterior",
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
      expect(repository.calls).toEqual([scenario.currentDatasetId]);
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
        result.metrics.every((metric) => metric.comparison !== undefined),
      ).toBe(true);
      expect(
        result.alerts.some((alert) => alert.category === "comparison"),
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
});

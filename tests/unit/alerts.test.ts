import { describe, expect, it } from "vitest";

import {
  analyzeDeviceConsumption,
  analyzeEnergyUsage,
} from "@/lib/dashboard/analytics";
import { generateDashboardAlerts } from "@/lib/dashboard/alerts";
import { dashboardDatasets } from "@/lib/dashboard/datasets";
import { getPeriodDefinition } from "@/lib/dashboard/periods";
import type { DashboardPeriod } from "@/lib/dashboard/types";

function buildAlerts(period: DashboardPeriod, compare: boolean) {
  const definition = getPeriodDefinition(period);
  const current = dashboardDatasets[definition.currentDatasetId];
  const previous = compare
    ? dashboardDatasets[definition.previousDatasetId]
    : undefined;

  return generateDashboardAlerts({
    period,
    currentLabel: current.label,
    temporalAnalysis: analyzeEnergyUsage(
      current,
      definition,
      previous,
    ),
    deviceAnalysis: analyzeDeviceConsumption(
      current.deviceConsumption,
      previous?.deviceConsumption,
      definition.comparisonLabel,
    ),
  });
}

describe("generateDashboardAlerts", () => {
  it("gera um alerta de pico com severidade e categoria corretas", () => {
    const alert = buildAlerts("today", false).find(
      (item) => item.category === "peak",
    );

    expect(alert).toEqual(
      expect.objectContaining({
        id: "today-peak-20h",
        severity: "high",
        category: "peak",
        source: "system",
      }),
    );
  });

  it("gera alerta de concentração por dispositivo", () => {
    const alert = buildAlerts("7d", false).find(
      (item) => item.category === "device",
    );

    expect(alert).toEqual(
      expect.objectContaining({
        id: "7d-device-concentration-air-conditioner",
        severity: "medium",
        category: "device",
        source: "device",
      }),
    );
  });

  it("gera alerta de distribuição", () => {
    const alert = buildAlerts("today", false).find(
      (item) => item.category === "distribution",
    );

    expect(alert).toEqual(
      expect.objectContaining({
        id: "today-top-three-distribution",
        severity: "low",
        category: "distribution",
      }),
    );
  });

  it("gera alertas de comparação e tendência quando há base anterior", () => {
    const alerts = buildAlerts("today", true);

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "today-overall-comparison",
          category: "comparison",
          severity: "high",
        }),
        expect.objectContaining({
          id: "today-device-trend-air-conditioner",
          category: "trend",
          severity: "high",
        }),
      ]),
    );
  });

  it("não gera comparação ou tendência sem base anterior", () => {
    const categories = buildAlerts("today", false).map(
      (alert) => alert.category,
    );

    expect(categories).not.toContain("comparison");
    expect(categories).not.toContain("trend");
  });

  it("não gera alertas indevidos para análises vazias", () => {
    const alerts = generateDashboardAlerts({
      period: "today",
      currentLabel: "Sem dados",
      temporalAnalysis: {
        points: [],
        totalKwh: 0,
        averageKwh: 0,
        peak: null,
        minimum: null,
        insights: [],
      },
      deviceAnalysis: {
        items: [],
        totalKwh: 0,
        insights: [],
      },
    });

    expect(alerts).toEqual([]);
  });

  it("mantém IDs e ordenação determinísticos", () => {
    const firstResult = buildAlerts("30d", true);
    const secondResult = buildAlerts("30d", true);

    expect(secondResult).toEqual(firstResult);
    expect(secondResult.map((alert) => alert.id)).toEqual(
      firstResult.map((alert) => alert.id),
    );
  });

  it("altera o resultado conforme a comparação é ligada", () => {
    const currentOnly = buildAlerts("7d", false);
    const withComparison = buildAlerts("7d", true);

    expect(withComparison).not.toEqual(currentOnly);
    expect(withComparison.length).toBeGreaterThan(currentOnly.length);
  });
});

import { describe, expect, it } from "vitest";

import {
  analyzeDeviceConsumption,
  analyzeEnergyUsage,
} from "@/lib/dashboard/analytics";
import { dashboardDatasets } from "@/lib/dashboard/datasets";
import { getPeriodDefinition } from "@/lib/dashboard/periods";

describe("analyzeEnergyUsage", () => {
  it("calcula total, média, pico e mínimo do dia", () => {
    const analysis = analyzeEnergyUsage(
      dashboardDatasets.today,
      getPeriodDefinition("today"),
    );

    expect(analysis.totalKwh).toBeCloseTo(8.7);
    expect(analysis.averageKwh).toBeCloseTo(0.725);
    expect(analysis.peak).toEqual(
      expect.objectContaining({
        id: "20h",
        currentKwh: 1.35,
        isPeak: true,
      }),
    );
    expect(analysis.minimum).toEqual(
      expect.objectContaining({
        id: "04h",
        currentKwh: 0.27,
        isMinimum: true,
      }),
    );
  });

  it("calcula participação e variação entre pontos", () => {
    const analysis = analyzeEnergyUsage(
      dashboardDatasets.today,
      getPeriodDefinition("today"),
    );
    const totalPercentage = analysis.points.reduce(
      (total, point) => total + point.periodPercentage,
      0,
    );

    expect(totalPercentage).toBeCloseTo(1);
    expect(analysis.points[0].deltaFromPreviousPointKwh).toBeNull();
    expect(analysis.points[1].deltaFromPreviousPointKwh).toBeCloseTo(-0.07);
    expect(analysis.peak?.periodPercentage).toBeCloseTo(1.35 / 8.7);
  });

  it("calcula comparações com o período anterior", () => {
    const analysis = analyzeEnergyUsage(
      dashboardDatasets.today,
      getPeriodDefinition("today"),
      dashboardDatasets.yesterday,
    );

    expect(analysis.previousTotalKwh).toBeCloseTo(7.7);
    expect(analysis.overallComparison).toEqual(
      expect.objectContaining({
        direction: "increase",
        previousLabel: "ontem",
      }),
    );
    expect(
      analysis.points.every((point) => point.comparison !== undefined),
    ).toBe(true);
  });

  it("identifica a concentração de consumo após as 18h", () => {
    const analysis = analyzeEnergyUsage(
      dashboardDatasets.today,
      getPeriodDefinition("today"),
    );
    const insight = analysis.insights.find(
      (item) => item.id === "evening-concentration",
    );

    expect(insight?.title).toContain("38%");
    expect(insight?.title).toContain("após as 18h");
    expect(insight?.description).toContain("3,33 kWh");
  });

  it("identifica a concentração em fins de semana", () => {
    const analysis = analyzeEnergyUsage(
      dashboardDatasets.last7Days,
      getPeriodDefinition("7d"),
    );
    const insight = analysis.insights.find(
      (item) => item.id === "weekend-concentration",
    );

    expect(insight?.title).toContain("31%");
    expect(insight?.description).toContain("19,3 kWh");
  });
});

describe("analyzeDeviceConsumption", () => {
  it("calcula ranking, participação e concentração dos líderes", () => {
    const analysis = analyzeDeviceConsumption(
      dashboardDatasets.today.deviceConsumption,
      undefined,
      "ontem",
    );
    const airConditioner = analysis.items.find(
      (item) => item.id === "air-conditioner",
    );
    const shower = analysis.items.find((item) => item.id === "shower");

    expect(analysis.totalKwh).toBeCloseTo(8.7);
    expect(airConditioner?.rank).toBe(1);
    expect(airConditioner?.percentage).toBeCloseTo(3 / 8.7);
    expect(shower?.rank).toBe(2);
    expect(
      analysis.insights.find((item) => item.id === "device-leader")?.title,
    ).toContain("34%");
    expect(
      analysis.insights.find(
        (item) => item.id === "top-two-concentration",
      )?.title,
    ).toContain("59%");
  });

  it("compara cada dispositivo com o período anterior", () => {
    const analysis = analyzeDeviceConsumption(
      dashboardDatasets.today.deviceConsumption,
      dashboardDatasets.yesterday.deviceConsumption,
      "ontem",
    );
    const airConditioner = analysis.items.find(
      (item) => item.id === "air-conditioner",
    );

    expect(analysis.previousTotalKwh).toBeCloseTo(7.7);
    expect(analysis.overallComparison).toBeDefined();
    expect(airConditioner?.periodComparison).toEqual(
      expect.objectContaining({
        direction: "increase",
        previousLabel: "ontem",
      }),
    );
    expect(
      airConditioner?.periodComparison?.absoluteChange,
    ).toBeCloseTo(0.6);
  });

  it("produz insights determinísticos", () => {
    const firstResult = analyzeDeviceConsumption(
      dashboardDatasets.last7Days.deviceConsumption,
      dashboardDatasets.previous7Days.deviceConsumption,
      "7 dias anteriores",
    );
    const secondResult = analyzeDeviceConsumption(
      dashboardDatasets.last7Days.deviceConsumption,
      dashboardDatasets.previous7Days.deviceConsumption,
      "7 dias anteriores",
    );

    expect(secondResult.insights).toEqual(firstResult.insights);
    expect(secondResult.items).toEqual(firstResult.items);
  });
});

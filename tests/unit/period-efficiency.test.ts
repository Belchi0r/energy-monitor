import { describe, expect, it } from "vitest";

import {
  getPeriodEfficiencyAriaLabel,
  getPeriodEfficiencyLabel,
} from "@/components/dashboard/PeriodEfficiencySummary";
import { dashboardDatasets } from "@/lib/dashboard/datasets";
import { buildPeriodEnergyAnalysis } from "@/lib/dashboard/period-efficiency";
import type { DashboardDataset } from "@/lib/dashboard/types";

function buildSevenDayAnalysis() {
  return buildPeriodEnergyAnalysis(
    "7d",
    dashboardDatasets.last7Days,
    dashboardDatasets.previous7Days,
  );
}

function buildThirtyDayAnalysis() {
  return buildPeriodEnergyAnalysis(
    "30d",
    dashboardDatasets.last30Days,
    dashboardDatasets.previous30Days,
  );
}

describe("eficiência histórica simulada", () => {
  it("calcula score 80 para os últimos 7 dias", () => {
    const analysis = buildSevenDayAnalysis();

    expect(analysis.summary.score).toBe(80);
    expect(analysis.summary.status).toBe("balanced");
  });

  it("calcula score 90 para os últimos 30 dias", () => {
    const analysis = buildThirtyDayAnalysis();

    expect(analysis.summary.score).toBe(90);
    expect(analysis.summary.status).toBe("efficient");
  });

  it.each([buildSevenDayAnalysis, buildThirtyDayAnalysis])(
    "mantém o score entre zero e cem",
    (buildAnalysis) => {
      const score = buildAnalysis().summary.score;

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    },
  );

  it("retorna justificativas estruturadas com impacto e evidência", () => {
    const reasons = buildSevenDayAnalysis().summary.reasons;

    expect(reasons.length).toBeGreaterThanOrEqual(3);
    expect(reasons[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expect.any(String),
        label: expect.any(String),
        description: expect.any(String),
        scoreImpact: expect.any(Number),
        evidence: expect.any(Object),
      }),
    );
  });

  it("mantém origem simulada e explica a diferença para Hoje", () => {
    const analysis = buildSevenDayAnalysis();

    expect(analysis.dataOrigin).toBe("simulated");
    expect(analysis.sourceLabel).toContain("históricos simulados");
    expect(analysis.sourceLabel).toContain(
      "não é diretamente comparável",
    );
  });

  it("fornece nome e rótulo acessível para o medidor histórico", () => {
    const analysis = buildSevenDayAnalysis();

    expect(getPeriodEfficiencyLabel("7d")).toBe(
      "Eficiência dos últimos 7 dias",
    );
    expect(getPeriodEfficiencyAriaLabel(analysis)).toBe(
      "Eficiência dos últimos 7 dias: 80 de 100",
    );
  });

  it("explica o aumento e a concentração de 7 dias", () => {
    const analysis = buildSevenDayAnalysis();
    const serialized = JSON.stringify(analysis.summary);

    expect(serialized).toContain("7,9%");
    expect(serialized).toContain("35%");
  });

  it("reconhece variação inferior a dois por cento em 30 dias", () => {
    expect(
      buildThirtyDayAnalysis().summary.reasons.some(
        (reason) => reason.id === "historical-stable-variation",
      ),
    ).toBe(true);
  });

  it("não depende de dispositivos persistidos atuais", () => {
    const serialized = JSON.stringify(buildSevenDayAnalysis());

    expect(serialized).not.toContain("averageDailyHours");
    expect(serialized).not.toContain("powerWatts");
    expect(serialized).not.toContain("monthlyBrl");
  });

  it("trata consumo histórico zero com score neutro", () => {
    const empty: DashboardDataset = {
      ...dashboardDatasets.last7Days,
      energyUsage: [],
      deviceConsumption: [],
    };
    const analysis = buildPeriodEnergyAnalysis(
      "7d",
      empty,
      dashboardDatasets.previous7Days,
    );

    expect(analysis.summary.score).toBe(75);
    expect(analysis.summary.status).toBe("balanced");
    expect(JSON.stringify(analysis)).not.toContain("NaN");
  });

  it("não chama o histórico residencial estimado de simulado quando está vazio", () => {
    const empty: DashboardDataset = {
      ...dashboardDatasets.last7Days,
      energyUsage: [],
      deviceConsumption: [],
    };
    const analysis = buildPeriodEnergyAnalysis(
      "7d",
      empty,
      dashboardDatasets.previous7Days,
      "estimated",
    );

    expect(JSON.stringify(analysis)).not.toMatch(/simulad/i);
    expect(analysis.summary.description).toContain(
      "estimativas históricas válidas",
    );
  });

  it("é determinístico e não altera os datasets", () => {
    const current = structuredClone(dashboardDatasets.last30Days);
    const previous = structuredClone(
      dashboardDatasets.previous30Days,
    );
    const originalCurrent = structuredClone(current);
    const originalPrevious = structuredClone(previous);

    expect(buildPeriodEnergyAnalysis("30d", current, previous)).toEqual(
      buildPeriodEnergyAnalysis("30d", current, previous),
    );
    expect(current).toEqual(originalCurrent);
    expect(previous).toEqual(originalPrevious);
  });
});

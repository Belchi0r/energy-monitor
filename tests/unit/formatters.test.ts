import { describe, expect, it } from "vitest";

import {
  formatChartEnergy,
  formatDashboardEventTimestamp,
  formatDayCount,
  formatDecimal,
  formatDetailedPercentage,
  formatEnergy,
  formatMetricNumber,
  formatMetricValue,
  formatPercentage,
  formatRatioPercentage,
  formatSignedChartEnergy,
  formatSignedRatioPercentage,
} from "@/lib/dashboard/formatters";

describe("formatadores numéricos", () => {
  it.each([
    [1, "1 dia"],
    [2, "2 dias"],
    [0, "0 dias"],
  ])("formata a contagem de %i dias", (value, expected) => {
    expect(formatDayCount(value)).toBe(expected);
  });

  it("formata energia com precisão adequada ao contexto", () => {
    expect(formatDecimal(8.74)).toBe("8,7");
    expect(formatEnergy(8.7)).toBe("8,7 kWh");
    expect(formatChartEnergy(1.35)).toBe("1,35 kWh");
    expect(formatSignedChartEnergy(-0.45)).toBe("-0,45 kWh");
  });

  it("formata potência e números inteiros", () => {
    expect(formatMetricNumber(1420, "power")).toEqual({
      value: "1.420",
      unit: "W",
    });
    expect(formatMetricNumber(5, "integer")).toEqual({ value: "5" });
  });

  it("formata moeda e neutraliza a imprecisão visual de ponto flutuante", () => {
    const formatted = formatMetricNumber(
      7.307999999999999,
      "currency",
    ).value;

    expect(formatted.replaceAll(/\s/g, " ")).toBe("R$ 7,31");
  });

  it("formata percentuais comuns, detalhados e sinalizados", () => {
    expect(formatPercentage(3, 8.7)).toBe("34%");
    expect(formatDetailedPercentage(1, 3)).toBe("33,3%");
    expect(formatRatioPercentage(0.13)).toBe("13%");
    expect(formatSignedRatioPercentage(0.13)).toBe("+13%");
    expect(formatSignedRatioPercentage(null)).toBe("sem base");
  });

  it("não propaga valores percentuais não finitos", () => {
    expect(formatRatioPercentage(Number.POSITIVE_INFINITY)).toBe("0%");
    expect(formatSignedRatioPercentage(Number.NaN)).toBe("0%");
  });

  it("formata uma métrica tipada", () => {
    expect(
      formatMetricValue({
        id: "periodConsumption",
        title: "Consumo",
        value: 8.7,
        format: "energy",
        description: "Fixture",
      }),
    ).toEqual({ value: "8,7", unit: "kWh" });
  });
});

describe("formatDashboardEventTimestamp", () => {
  const occurredAtIso = "2026-07-22T14:32:00-03:00";

  it("formata o período today", () => {
    const timestamp = formatDashboardEventTimestamp(
      occurredAtIso,
      "today",
    );

    expect(timestamp.timelineLabel).toBe("14:32");
    expect(timestamp.tableLabel).toBe("Hoje, 14:32");
  });

  it("formata o período de sete dias", () => {
    const timestamp = formatDashboardEventTimestamp(occurredAtIso, "7d");

    expect(timestamp.timelineLabel).toBe("Qua., 22/07");
    expect(timestamp.tableLabel).toBe("Qua., 22/07, 14:32");
  });

  it("formata o período de trinta dias", () => {
    const timestamp = formatDashboardEventTimestamp(occurredAtIso, "30d");

    expect(timestamp.timelineLabel).toBe("22 de jul.");
    expect(timestamp.tableLabel).toBe("22 jul., 14:32");
    expect(timestamp.accessibleLabel).toContain("22 de julho de 2026");
  });

  it("mantém America/Sao_Paulo em um timestamp UTC", () => {
    const timestamp = formatDashboardEventTimestamp(
      "2026-07-23T01:30:00Z",
      "30d",
    );

    expect(timestamp.timelineLabel).toBe("22 de jul.");
    expect(timestamp.tableLabel).toBe("22 jul., 22:30");
    expect(timestamp.accessibleLabel).toContain("22:30");
  });
});

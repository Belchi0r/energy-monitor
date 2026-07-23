import { describe, expect, it } from "vitest";

import {
  alignTemporalSeries,
  compareNumbers,
  sumEnergy,
  validateDashboardDataset,
} from "@/lib/dashboard/comparison";
import { dashboardDatasets } from "@/lib/dashboard/datasets";

describe("compareNumbers", () => {
  it("calcula uma variação positiva relevante", () => {
    const result = compareNumbers(120, 100, "período anterior");

    expect(result.absoluteChange).toBe(20);
    expect(result.percentageChange).toBeCloseTo(0.2);
    expect(result.direction).toBe("increase");
    expect(result.significance).toBe("relevant");
  });

  it("calcula uma variação negativa moderada", () => {
    const result = compareNumbers(95, 100, "período anterior");

    expect(result.absoluteChange).toBe(-5);
    expect(result.percentageChange).toBeCloseTo(-0.05);
    expect(result.direction).toBe("decrease");
    expect(result.significance).toBe("moderate");
  });

  it("classifica valores iguais como estáveis", () => {
    const result = compareNumbers(100, 100, "período anterior");

    expect(result.absoluteChange).toBe(0);
    expect(result.percentageChange).toBe(0);
    expect(result.direction).toBe("stable");
    expect(result.significance).toBe("stable");
  });

  it.each([
    [101, "stable"],
    [105, "moderate"],
    [110, "relevant"],
  ] as const)(
    "classifica 100 → %s com significância %s",
    (currentValue, significance) => {
      expect(
        compareNumbers(currentValue, 100, "período anterior").significance,
      ).toBe(significance);
    },
  );

  it("representa uma base anterior zero sem NaN ou Infinity", () => {
    const result = compareNumbers(5, 0, "período anterior");

    expect(result.percentageChange).toBeNull();
    expect(result.absoluteChange).toBe(5);
    expect(Number.isFinite(result.absoluteChange)).toBe(true);
    expect(result.message).toContain("sem base percentual");
  });
});

describe("utilitários de comparação temporal", () => {
  it("alinha as séries atual e anterior por posição", () => {
    const aligned = alignTemporalSeries(
      dashboardDatasets.today.energyUsage,
      dashboardDatasets.yesterday.energyUsage,
    );

    expect(aligned).toHaveLength(12);
    expect(aligned[0]).toEqual(
      expect.objectContaining({
        id: "00h",
        index: 0,
        currentKwh: 0.35,
        previousKwh: 0.32,
      }),
    );
  });

  it("soma todos os pontos de energia", () => {
    expect(sumEnergy(dashboardDatasets.today.energyUsage)).toBeCloseTo(8.7);
  });

  it("aceita os datasets válidos atuais", () => {
    expect(() =>
      Object.values(dashboardDatasets).forEach(validateDashboardDataset),
    ).not.toThrow();
  });

  it("rejeita datasets com totais divergentes", () => {
    const invalidDataset = {
      ...dashboardDatasets.today,
      deviceConsumption: [
        {
          id: "invalid",
          device: "Inválido",
          description: "Fixture inválida",
          consumptionKwh: 1,
        },
      ],
    };

    expect(() => validateDashboardDataset(invalidDataset)).toThrow(
      /divergentes/i,
    );
  });
});

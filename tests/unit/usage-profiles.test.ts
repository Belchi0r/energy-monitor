import { describe, expect, it } from "vitest";

import {
  buildUsageProfileWeights,
  getDefaultUsageProfile,
  resolveUsageProfile,
} from "@/lib/energy/usage-profiles";

function positiveWeightIndexes(weights: readonly number[]) {
  return weights.flatMap((weight, index) =>
    weight > 0 ? [index] : [],
  );
}

describe("perfis de uso", () => {
  it("distribui o perfil contínuo igualmente nos 12 intervalos", () => {
    const weights = buildUsageProfileWeights({
      category: "Refrigeração",
      usageProfileType: "CONTINUOUS",
    });

    expect(weights).toHaveLength(12);
    expect(new Set(weights)).toHaveLength(1);
    expect(weights.every((weight) => weight > 0)).toBe(true);
  });

  it("concentra o perfil da manhã entre 06h e 12h", () => {
    const weights = buildUsageProfileWeights({
      category: "Outros",
      usageProfileType: "MORNING",
    });

    expect(positiveWeightIndexes(weights)).toEqual([3, 4, 5]);
  });

  it("concentra o perfil da noite entre 18h e 24h", () => {
    const weights = buildUsageProfileWeights({
      category: "Iluminação",
      usageProfileType: "EVENING",
    });

    expect(positiveWeightIndexes(weights)).toEqual([9, 10, 11]);
  });

  it("separa o perfil dividido entre manhã e tarde", () => {
    const weights = buildUsageProfileWeights({
      category: "Eletrônicos",
      usageProfileType: "SPLIT",
    });

    expect(positiveWeightIndexes(weights)).toEqual([4, 5, 7, 8]);
  });

  it("respeita pesos personalizados mesmo sem total normalizado", () => {
    const weights = buildUsageProfileWeights({
      category: "Outros",
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 8, endHour: 10, weight: 2 },
        { startHour: 18, endHour: 20, weight: 6 },
      ],
    });

    expect(weights[4]).toBe(2);
    expect(weights[9]).toBe(6);
  });

  it("soma deterministicamente janelas sobrepostas", () => {
    const weights = buildUsageProfileWeights({
      category: "Outros",
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 8, endHour: 12, weight: 1 },
        { startHour: 10, endHour: 14, weight: 1 },
      ],
    });

    expect(weights[5]).toBe(1);
    expect(weights[4]).toBe(0.5);
    expect(weights[6]).toBe(0.5);
  });

  it("usa fallback de categoria para janelas inválidas", () => {
    const profile = resolveUsageProfile({
      category: "Refrigeração",
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 20, endHour: 10, weight: -1 },
      ],
    });

    expect(profile.type).toBe("CONTINUOUS");
    expect(profile.windows).toEqual([
      { startHour: 0, endHour: 24, weight: 1 },
    ]);
  });

  it("usa fallback por categoria quando o perfil está ausente", () => {
    expect(getDefaultUsageProfile("Climatização").type).toBe(
      "EVENING",
    );
  });

  it("usa perfil distribuído para categoria desconhecida", () => {
    const profile = resolveUsageProfile({
      category: "Categoria legada",
    });

    expect(profile.type).toBe("DISTRIBUTED");
    expect(profile.windows.length).toBeGreaterThan(1);
  });

  it("produz sempre o mesmo resultado para a mesma entrada", () => {
    const input = {
      category: "Eletrônicos",
      usageProfileType: "SPLIT",
    } as const;

    expect(buildUsageProfileWeights(input)).toEqual(
      buildUsageProfileWeights(input),
    );
  });
});

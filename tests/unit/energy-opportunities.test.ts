import { describe, expect, it } from "vitest";

import {
  buildEnergyAnalysis,
} from "@/lib/energy/advisor/energy-advisor";
import { getSuggestedReduction } from "@/lib/energy/advisor/energy-opportunities";
import { formatDeviceDisplayName } from "@/lib/energy/advisor/energy-advisor.utils";
import { buildTodayEnergySnapshot } from "@/lib/energy/energy-engine";
import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";
import type { EnergyDevice } from "@/lib/energy/energy-engine.types";

function createDevice(
  id: string,
  overrides: Partial<EnergyDevice> = {},
): EnergyDevice {
  return {
    id,
    name: `Dispositivo ${id}`,
    category: "Eletrônicos",
    powerWatts: 500,
    averageDailyHours: 2,
    status: "active",
    usageProfileType: "SPLIT",
    usageWindows: [
      { startHour: 8, endHour: 12, weight: 0.5 },
      { startHour: 14, endHour: 18, weight: 0.5 },
    ],
    ...overrides,
  };
}

function createCurrentScenario(): readonly EnergyDevice[] {
  return [
    createDevice("notebook", {
      name: "notebook",
      powerWatts: 200,
      averageDailyHours: 3.7,
    }),
    createDevice("air-conditioner", {
      name: "Ar-condicionado",
      category: "Climatização",
      powerWatts: 1_500,
      averageDailyHours: 2,
      usageProfileType: "CUSTOM",
      usageWindows: [{ startHour: 19, endHour: 23, weight: 1 }],
    }),
    createDevice("shower", {
      name: "Chuveiro elétrico",
      category: "Aquecimento",
      powerWatts: 5_500,
      averageDailyHours: 0.38,
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 6, endHour: 8, weight: 0.45 },
        { startHour: 18, endHour: 22, weight: 0.55 },
      ],
    }),
    createDevice("refrigerator", {
      name: "Geladeira",
      category: "Refrigeração",
      powerWatts: 150,
      averageDailyHours: 10,
      usageProfileType: "CONTINUOUS",
      usageWindows: [{ startHour: 0, endHour: 24, weight: 1 }],
    }),
    createDevice("washing-machine", {
      name: "Máquina de lavar",
      category: "Lavanderia",
      powerWatts: 600,
      averageDailyHours: 2,
      usageProfileType: "CUSTOM",
      usageWindows: [{ startHour: 10, endHour: 14, weight: 1 }],
    }),
    createDevice("others", {
      name: "Outros",
      category: "Outros",
      powerWatts: 300,
      averageDailyHours: 3,
      usageProfileType: "DISTRIBUTED",
      usageWindows: [
        { startHour: 6, endHour: 10, weight: 0.2 },
        { startHour: 10, endHour: 18, weight: 0.5 },
        { startHour: 18, endHour: 22, weight: 0.3 },
      ],
    }),
  ];
}

function analyze(
  devices: readonly EnergyDevice[],
  tariffBrlPerKwh = DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
) {
  return buildEnergyAnalysis(
    buildTodayEnergySnapshot(devices, tariffBrlPerKwh),
    {
      tariffBrlPerKwh,
    },
  );
}

describe("motor de oportunidades por dispositivo", () => {
  it("preserva o score 75 no cenário atual", () => {
    expect(analyze(createCurrentScenario()).summary.score).toBe(75);
  });

  it("avalia todos os dispositivos ativos", () => {
    const analysis = analyze(createCurrentScenario());

    expect(analysis.opportunities).toHaveLength(6);
    expect(
      new Set(
        analysis.opportunities.map(
          (opportunity) => opportunity.deviceId,
        ),
      ).size,
    ).toBe(6);
  });

  it.each([
    ["Notebook", "eligible", "reduce_usage"],
    ["Ar-condicionado", "eligible", "reduce_usage"],
    ["Chuveiro elétrico", "eligible", "reduce_usage"],
    ["Geladeira", "essential", "maintain_current_usage"],
    ["Máquina de lavar", "not_recommended", "maintain_current_usage"],
    ["Outros", "invalid_configuration", "review_configuration"],
  ] as const)(
    "classifica %s como %s com estratégia %s",
    (deviceName, eligibility, strategy) => {
      const opportunity = analyze(
        createCurrentScenario(),
      ).opportunities.find(
        (item) => item.deviceName === deviceName,
      );

      expect(opportunity).toEqual(
        expect.objectContaining({
          eligibility,
          strategy,
        }),
      );
    },
  );

  it("usa redução realista e segura para o chuveiro", () => {
    const opportunity = analyze(
      createCurrentScenario(),
    ).opportunities.find(
      (item) => item.deviceName === "Chuveiro elétrico",
    );

    expect(opportunity?.suggestion?.minutesReduction).toBe(5);
    expect(
      opportunity?.suggestion?.hoursReduction ?? 1,
    ).toBeLessThan(0.38);
    expect(
      opportunity?.suggestion?.percentageReduction ?? 100,
    ).toBeLessThanOrEqual(25);
  });

  it("não recomenda desligar ou reduzir a geladeira", () => {
    const analysis = analyze(createCurrentScenario());
    const refrigerator = analysis.opportunities.find(
      (item) => item.deviceName === "Geladeira",
    );

    expect(refrigerator?.savings.monthlyBrl).toBe(0);
    expect(
      analysis.recommendations.some(
        (recommendation) =>
          recommendation.deviceName === "Geladeira" &&
          recommendation.type === "reduce_usage",
      ),
    ).toBe(false);
  });

  it("solicita detalhamento da categoria Outros sem inventar horário", () => {
    const opportunity = analyze(
      createCurrentScenario(),
    ).opportunities.find(
      (item) => item.deviceName === "Outros",
    );

    expect(opportunity?.strategy).toBe("review_configuration");
    expect(opportunity?.evidence.reason).toContain(
      "Detalhe quais aparelhos",
    );
    expect(opportunity?.savings.monthlyBrl).toBe(0);
  });

  it("exibe no máximo três recomendações prioritárias", () => {
    const recommendations = analyze(
      createCurrentScenario(),
    ).recommendations;

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map((item) => item.deviceName)).toEqual([
      "Ar-condicionado",
      "Chuveiro elétrico",
      "Notebook",
    ]);
  });

  it("ordena por opportunity score antes da economia isolada", () => {
    const opportunities = analyze(
      createCurrentScenario(),
    ).opportunities.filter(
      (opportunity) => opportunity.eligibility === "eligible",
    );

    expect(
      opportunities.every(
        (opportunity, index) =>
          index === 0 ||
          opportunities[index - 1].opportunityScore >=
            opportunity.opportunityScore,
      ),
    ).toBe(true);
    expect(opportunities.map((item) => item.deviceName)).toEqual([
      "Ar-condicionado",
      "Chuveiro elétrico",
      "Notebook",
    ]);
  });

  it("usa nome estável como desempate determinístico", () => {
    const analysis = analyze([
      createDevice("beta", { name: "Beta" }),
      createDevice("alpha", { name: "Alfa" }),
    ]);

    expect(
      analysis.opportunities
        .filter((item) => item.eligibility === "eligible")
        .map((item) => item.deviceName),
    ).toEqual(["Alfa", "Beta"]);
  });

  it("calcula economia diária, mensal e anual com a tarifa centralizada", () => {
    const airConditioner = analyze(
      createCurrentScenario(),
    ).opportunities.find(
      (item) => item.deviceName === "Ar-condicionado",
    );

    expect(airConditioner?.savings).toEqual({
      dailyKwh: 0.75,
      monthlyKwh: 22.5,
      monthlyBrl: 18.9,
      annualBrl: 226.8,
    });
  });

  it("respeita a tarifa recebida sem calcular valores no componente", () => {
    const airConditioner = analyze(
      createCurrentScenario(),
      1,
    ).opportunities.find(
      (item) => item.deviceName === "Ar-condicionado",
    );

    expect(airConditioner?.savings.monthlyBrl).toBe(22.5);
  });

  it("deriva a economia do Notebook dos dados atuais", () => {
    const notebook = analyze(
      createCurrentScenario(),
    ).opportunities.find(
      (item) => item.deviceName === "Notebook",
    );

    expect(notebook?.savings).toEqual({
      dailyKwh: 0.1,
      monthlyKwh: 3,
      monthlyBrl: 2.52,
      annualBrl: 30.24,
    });
  });

  it("deriva a economia do Chuveiro sem hardcode financeiro", () => {
    const shower = analyze(
      createCurrentScenario(),
    ).opportunities.find(
      (item) => item.deviceName === "Chuveiro elétrico",
    );

    expect(shower?.savings).toEqual({
      dailyKwh: 0.4583,
      monthlyKwh: 13.75,
      monthlyBrl: 11.55,
      annualBrl: 138.6,
    });
  });

  it("separa economia principal do potencial combinado", () => {
    const analysis = analyze(createCurrentScenario());

    expect(analysis.primaryRecommendationSavings.monthlyBrl).toBe(
      18.9,
    );
    expect(analysis.combinedSavingsPotential.monthlyBrl).toBe(
      32.97,
    );
    expect(analysis.combinedSavingsPotential.annualBrl).toBe(395.64);
    expect(
      analysis.combinedSavingsPotential.monthlyBrl,
    ).toBeGreaterThan(
      analysis.primaryRecommendationSavings.monthlyBrl,
    );
    expect(analysis.financialOpportunityCount).toBe(3);
  });

  it("recalcula economias sem alterar kWh ou score", () => {
    const defaultTariff = analyze(createCurrentScenario());
    const customTariff = analyze(createCurrentScenario(), 1);

    expect(customTariff.combinedSavingsPotential.monthlyKwh).toBe(
      defaultTariff.combinedSavingsPotential.monthlyKwh,
    );
    expect(customTariff.combinedSavingsPotential.monthlyBrl).toBe(
      39.25,
    );
    expect(customTariff.combinedSavingsPotential.annualBrl).toBe(471);
    expect(customTariff.summary.score).toBe(
      defaultTariff.summary.score,
    );
  });

  it("usa apenas um grupo financeiro por dispositivo", () => {
    const financial = analyze(
      createCurrentScenario(),
    ).opportunities.filter((opportunity) => opportunity.cumulative);
    const groups = financial.map(
      (opportunity) => opportunity.savingsGroupId,
    );

    expect(new Set(groups).size).toBe(groups.length);
    expect(
      financial.every(
        (opportunity) =>
          opportunity.savingsGroupId ===
          opportunity.exclusivityGroup,
      ),
    ).toBe(true);
  });

  it("não inclui mudança de horário na economia combinada", () => {
    const analysis = analyze([
      createDevice("washer", {
        name: "Máquina de lavar",
        category: "Lavanderia",
        powerWatts: 600,
        averageDailyHours: 2,
        usageProfileType: "EVENING",
        usageWindows: [{ startHour: 18, endHour: 22, weight: 1 }],
      }),
    ]);

    expect(analysis.opportunities[0].strategy).toBe(
      "shift_schedule",
    );
    expect(analysis.combinedSavingsPotential.monthlyBrl).toBe(0);
    expect(analysis.financialOpportunityCount).toBe(0);
  });

  it("oculta economia irrelevante pelo limite mínimo", () => {
    const analysis = analyze([
      createDevice("tiny", {
        powerWatts: 1,
        averageDailyHours: 1,
      }),
    ]);

    expect(analysis.opportunities[0].eligibility).toBe(
      "insufficient_usage",
    );
    expect(analysis.combinedSavingsPotential.monthlyBrl).toBe(0);
  });

  it("mantém somente uma recomendação quando há uma oportunidade válida", () => {
    const analysis = analyze([
      createDevice("single-valid", {
        name: "Computador",
        powerWatts: 1_000,
        averageDailyHours: 2,
      }),
    ]);

    expect(analysis.recommendations).toHaveLength(1);
    expect(analysis.recommendations[0].type).toBe("reduce_usage");
  });

  it("não inventa redução quando há somente dispositivos essenciais", () => {
    const analysis = analyze([
      createDevice("fridge", {
        name: "Geladeira",
        category: "Refrigeração",
        powerWatts: 150,
        averageDailyHours: 10,
        usageProfileType: "CONTINUOUS",
        usageWindows: [{ startHour: 0, endHour: 24, weight: 1 }],
      }),
    ]);

    expect(
      analysis.recommendations.some(
        (recommendation) =>
          recommendation.type === "reduce_usage",
      ),
    ).toBe(false);
    expect(analysis.combinedSavingsPotential.monthlyBrl).toBe(0);
  });

  it("trata consumo zero sem NaN ou recomendação financeira", () => {
    const analysis = analyze([
      createDevice("zero", {
        powerWatts: 0,
      }),
    ]);

    expect(analysis.opportunities[0].eligibility).toBe(
      "zero_consumption",
    );
    expect(analysis.financialOpportunityCount).toBe(0);
    expect(JSON.stringify(analysis)).not.toContain("NaN");
  });

  it("trata ausência de dispositivos sem cards inventados", () => {
    const analysis = analyze([]);

    expect(analysis.opportunities).toEqual([]);
    expect(analysis.combinedSavingsPotential.monthlyBrl).toBe(0);
    expect(analysis.recommendations).toHaveLength(1);
    expect(analysis.recommendations[0].id).toBe("activate-devices");
  });

  it("analisa mais de dez dispositivos e limita somente a apresentação", () => {
    const devices = Array.from({ length: 12 }, (_, index) =>
      createDevice(`device-${index}`, {
        name: `Equipamento ${String(index).padStart(2, "0")}`,
      }),
    );
    const analysis = analyze(devices);

    expect(analysis.opportunities).toHaveLength(12);
    expect(analysis.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("é determinístico e não altera a entrada", () => {
    const devices = createCurrentScenario();
    const original = structuredClone(devices);
    const first = analyze(devices);
    const second = analyze(devices);

    expect(first).toEqual(second);
    expect(devices).toEqual(original);
  });

  it.each([
    [0.1, 0],
    [0.5, 5],
    [1, 10],
    [2, 30],
    [4, 30],
    [8, 60],
  ])(
    "gera redução gradual para %s h/dia",
    (hours, expectedMinutes) => {
      const reduction = getSuggestedReduction(hours);

      expect(reduction.minutes).toBe(expectedMinutes);
      expect(reduction.hours).toBeLessThanOrEqual(hours);
      expect(reduction.percentage).toBeLessThanOrEqual(25);
    },
  );

  it("capitaliza nomes conhecidos apenas na apresentação", () => {
    expect(formatDeviceDisplayName("notebook")).toBe("Notebook");
    expect(formatDeviceDisplayName("chuveiro elétrico")).toBe(
      "Chuveiro elétrico",
    );
    expect(formatDeviceDisplayName("Outros")).toBe("Outros");
  });
});

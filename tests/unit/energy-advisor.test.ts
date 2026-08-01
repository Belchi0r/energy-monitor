import { describe, expect, it } from "vitest";

import { demoDevices } from "@/lib/devices/demo-devices";
import {
  ENERGY_ADVISOR_LIMITS,
  RECOMMENDATION_PRIORITY_WEIGHT,
} from "@/lib/energy/advisor/energy-advisor.constants";
import { buildEnergyAnalysis } from "@/lib/energy/advisor/energy-advisor";
import type { EnergyRecommendation } from "@/lib/energy/advisor/energy-advisor.types";
import {
  calculateSavingsPotential,
  sortRecommendations,
} from "@/lib/energy/advisor/energy-advisor.utils";
import { buildTodayEnergySnapshot } from "@/lib/energy/energy-engine";
import type { EnergyDevice } from "@/lib/energy/energy-engine.types";
import { MockDashboardRepository } from "@/lib/repositories/mock-dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";
import { DeviceService } from "@/lib/services/device-service";
import {
  createDemoDeviceRecords,
  InMemoryDeviceRepository,
} from "@/tests/device-test-helpers";

function createDevice(
  id: string,
  overrides: Partial<EnergyDevice> = {},
): EnergyDevice {
  return {
    id,
    name: `Dispositivo ${id}`,
    category: "Outros",
    powerWatts: 500,
    averageDailyHours: 1,
    status: "active",
    usageProfileType: "CONTINUOUS",
    usageWindows: [{ startHour: 0, endHour: 24, weight: 1 }],
    ...overrides,
  };
}

function analyze(devices: readonly EnergyDevice[]) {
  return buildEnergyAnalysis(buildTodayEnergySnapshot(devices));
}

function createAttentionDevices(): readonly EnergyDevice[] {
  return [
    createDevice("evening", {
      name: "Equipamento flexível",
      powerWatts: 1_000,
      averageDailyHours: 5,
      usageProfileType: "EVENING",
      usageWindows: [{ startHour: 18, endHour: 24, weight: 1 }],
    }),
    createDevice("continuous", {
      powerWatts: 1_000,
      averageDailyHours: 5,
    }),
  ];
}

function createCriticalDevices(): readonly EnergyDevice[] {
  return [
    createDevice("critical", {
      name: "Carga concentrada",
      powerWatts: 2_000,
      averageDailyHours: 5,
      usageProfileType: "EVENING",
      usageWindows: [{ startHour: 18, endHour: 24, weight: 1 }],
    }),
  ];
}

function createReductionAnalysis(tariffBrlPerKwh = 0.84) {
  const snapshot = buildTodayEnergySnapshot([
    createDevice("air", {
      name: "Ar-condicionado",
      category: "Climatização",
      powerWatts: 1_500,
      averageDailyHours: 2,
      usageProfileType: "EVENING",
      usageWindows: [{ startHour: 18, endHour: 24, weight: 1 }],
    }),
    createDevice("light", {
      name: "Iluminação",
      category: "Iluminação",
      powerWatts: 200,
      averageDailyHours: 2,
    }),
  ]);

  return buildEnergyAnalysis(snapshot, { tariffBrlPerKwh });
}

function getReductionRecommendation(
  analysis: ReturnType<typeof createReductionAnalysis>,
) {
  const recommendation = analysis.recommendations.find(
    (item) => item.type === "reduce_usage",
  );

  if (!recommendation) {
    throw new Error("Recomendação de redução esperada no cenário.");
  }

  return recommendation;
}

describe("EnergyAdvisor", () => {
  it("mantém o score entre 0 e 100", () => {
    const analyses = [
      analyze([]),
      analyze(demoDevices),
      analyze(createCriticalDevices()),
    ];

    expect(
      analyses.every(
        ({ summary }) =>
          summary.score >= 0 && summary.score <= 100,
      ),
    ).toBe(true);
  });

  it("classifica como eficiente um consumo bem distribuído", () => {
    const devices = Array.from({ length: 4 }, (_, index) =>
      createDevice(`efficient-${index}`, {
        powerWatts: 400,
        averageDailyHours: 1,
      }),
    );

    expect(analyze(devices).summary.status).toBe("efficient");
  });

  it("classifica o cenário demonstrativo atual como equilibrado", () => {
    expect(analyze(demoDevices).summary.status).toBe("balanced");
  });

  it("classifica concentração moderada como atenção", () => {
    expect(analyze(createAttentionDevices()).summary.status).toBe(
      "attention",
    );
  });

  it("detecta concentração elevada", () => {
    const analysis = analyze(createCriticalDevices());

    expect(
      analysis.alerts.some(
        (item) => item.category === "concentration",
      ),
    ).toBe(true);
  });

  it("detecta consumo elevado após as 18h", () => {
    const analysis = analyze(createAttentionDevices());

    expect(
      analysis.alerts.some(
        (item) => item.category === "schedule",
      ),
    ).toBe(true);
    expect(
      analysis.highlights.find((item) => item.id === "evening")
        ?.value,
    ).toBeGreaterThanOrEqual(
      ENERGY_ADVISOR_LIMITS.relevantEveningPercentage,
    );
  });

  it("explica um pico elevado com dados do snapshot", () => {
    const analysis = analyze(createCriticalDevices());
    const peak = analysis.alerts.find(
      (item) => item.category === "peak",
    );

    expect(
      peak?.evidence.some(
        (item) => item.label === "Horário do pico",
      ),
    ).toBe(true);
    expect(peak?.description).toContain("responderam por");
  });

  it("escolhe o maior consumidor elegível para redução", () => {
    const recommendation = getReductionRecommendation(
      createReductionAnalysis(),
    );

    expect(recommendation.deviceName).toBe("Ar-condicionado");
    expect(recommendation.action?.suggestedHoursReduction).toBeLessThanOrEqual(
      2,
    );
  });

  it("não recomenda desligar ou reduzir equipamento essencial", () => {
    const analysis = analyze([
      createDevice("fridge", {
        name: "Geladeira",
        category: "Refrigeração",
        powerWatts: 500,
        averageDailyHours: 10,
      }),
    ]);

    expect(
      analysis.recommendations.some(
        (item) => item.type === "reduce_usage",
      ),
    ).toBe(false);
    expect(JSON.stringify(analysis).toLocaleLowerCase("pt-BR")).not.toContain(
      "desligar geladeira",
    );
  });

  it("calcula a economia diária pela potência e redução sugerida", () => {
    expect(
      getReductionRecommendation(createReductionAnalysis()).impact
        .dailyKwh,
    ).toBe(0.75);
  });

  it("projeta a economia mensal em 30 dias", () => {
    expect(
      getReductionRecommendation(createReductionAnalysis()).impact
        .monthlyKwh,
    ).toBe(22.5);
  });

  it("projeta a economia anual em 12 meses", () => {
    expect(
      getReductionRecommendation(createReductionAnalysis()).impact
        .annualBrl,
    ).toBe(226.8);
  });

  it("usa a tarifa recebida nas projeções financeiras", () => {
    expect(
      getReductionRecommendation(createReductionAnalysis(1)).impact
        .monthlyBrl,
    ).toBe(22.5);
  });

  it("calcula o impacto de CO₂ com fator demonstrativo", () => {
    const analysis = createReductionAnalysis();
    const impact = analysis.environmentalImpact;

    expect(impact?.monthlyCo2KgAvoided).toBeCloseTo(
      analysis.combinedSavingsPotential.monthlyKwh * 0.084,
    );
    expect(impact?.isDemonstrative).toBe(true);
  });

  it("evita dupla contagem pelo grupo de economia", () => {
    const recommendation = getReductionRecommendation(
      createReductionAnalysis(),
    );
    const duplicate: EnergyRecommendation = {
      ...recommendation,
      id: `${recommendation.id}-alternative`,
    };
    const total = calculateSavingsPotential([
      recommendation,
      duplicate,
    ]);

    expect(total).toEqual(recommendation.impact);
  });

  it("mantém estado neutro sem dispositivos", () => {
    const analysis = analyze([]);

    expect(analysis.summary.status).toBe("balanced");
    expect(analysis.savingsPotential.monthlyBrl).toBe(0);
    expect(analysis.alerts).toEqual([]);
  });

  it("contextualiza corretamente um único dispositivo", () => {
    const analysis = analyze([
      createDevice("single", {
        powerWatts: 1_000,
        averageDailyHours: 2,
      }),
    ]);
    const concentration = analysis.alerts.find(
      (item) => item.category === "concentration",
    );

    expect(concentration?.description).toContain(
      "único dispositivo ativo",
    );
    expect(concentration?.description).not.toContain("dois maiores");
  });

  it("trata consumo zero sem divisão inválida", () => {
    const analysis = analyze([
      createDevice("zero", { powerWatts: 0 }),
    ]);

    expect(analysis.savingsPotential.dailyKwh).toBe(0);
    expect(JSON.stringify(analysis)).not.toContain("NaN");
  });

  it("identifica perfil fallback", () => {
    const analysis = analyze([
      createDevice("fallback", {
        usageProfileType: "CUSTOM",
        usageWindows: [],
        usageProfileFallbackUsed: true,
      }),
    ]);

    expect(
      analysis.recommendations.some(
        (item) => item.id === "configuration-fallback",
      ),
    ).toBe(true);
  });

  it("identifica configuração suspeita por faixa demonstrativa", () => {
    const analysis = analyze([
      createDevice("suspicious", {
        category: "Refrigeração",
        name: "Geladeira",
        powerWatts: 5_000,
        averageDailyHours: 10,
      }),
    ]);
    const recommendation = analysis.recommendations.find(
      (item) => item.id === "configuration-suspicious",
    );

    expect(
      recommendation?.evidence.configurationReasons?.length,
    ).toBeGreaterThan(0);
  });

  it("é determinístico para a mesma entrada", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);

    expect(buildEnergyAnalysis(snapshot)).toEqual(
      buildEnergyAnalysis(snapshot),
    );
  });

  it("não altera o snapshot recebido", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);
    const original = structuredClone(snapshot);

    buildEnergyAnalysis(snapshot);

    expect(snapshot).toEqual(original);
  });

  it("ordena alertas por severidade antes do impacto", () => {
    const analysis = analyze(createCriticalDevices());
    const severity = { info: 1, low: 2, medium: 3, high: 4 };

    expect(
      analysis.alerts.every(
        (alert, index) =>
          index === 0 ||
          severity[analysis.alerts[index - 1].severity] >=
            severity[alert.severity],
      ),
    ).toBe(true);
  });

  it("limita a quantidade de alertas", () => {
    const analysis = analyze([
      ...createCriticalDevices(),
      createDevice("suspicious", {
        powerWatts: 20_000,
        usageProfileFallbackUsed: true,
      }),
      createDevice("flex", {
        name: "Máquina de lavar",
        category: "Lavanderia",
        powerWatts: 1_000,
        averageDailyHours: 4,
        usageProfileType: "EVENING",
        usageWindows: [{ startHour: 18, endHour: 24, weight: 1 }],
      }),
    ]);

    expect(analysis.alerts.length).toBeLessThanOrEqual(
      ENERGY_ADVISOR_LIMITS.maxAlerts,
    );
  });

  it("limita e prioriza as recomendações", () => {
    const analysis = analyze([
      ...createCriticalDevices(),
      createDevice("suspicious", {
        powerWatts: 20_000,
        usageProfileFallbackUsed: true,
      }),
      createDevice("flex", {
        name: "Máquina de lavar",
        category: "Lavanderia",
        powerWatts: 1_000,
        averageDailyHours: 4,
        usageProfileType: "EVENING",
        usageWindows: [{ startHour: 18, endHour: 24, weight: 1 }],
      }),
    ]);
    const sorted = sortRecommendations(analysis.recommendations);

    expect(analysis.recommendations.length).toBeLessThanOrEqual(
      ENERGY_ADVISOR_LIMITS.maxRecommendations,
    );
    expect(
      RECOMMENDATION_PRIORITY_WEIGHT[
        analysis.recommendations[0].priority
      ],
    ).toBeGreaterThanOrEqual(
      RECOMMENDATION_PRIORITY_WEIGHT[
        analysis.recommendations.at(-1)?.priority ?? "low"
      ],
    );
    expect(analysis.recommendations).toEqual(sorted);
  });

  it("não produz mensagens com NaN ou Infinity", () => {
    const analysis = analyze([
      createDevice("invalid", {
        powerWatts: Number.POSITIVE_INFINITY,
        averageDailyHours: Number.NaN,
      }),
    ]);
    const serialized = JSON.stringify(analysis);

    expect(serialized).not.toContain("NaN");
    expect(serialized).not.toContain("Infinity");
  });

  it("mantém cálculos finitos com valores muito altos", () => {
    const analysis = analyze([
      createDevice("extreme", {
        powerWatts: Number.MAX_VALUE,
        averageDailyHours: 24,
      }),
    ]);

    expect(Number.isFinite(analysis.summary.score)).toBe(true);
    expect(
      Object.values(analysis.savingsPotential).every(Number.isFinite),
    ).toBe(true);
  });

  it("integra diretamente com TodayEnergySnapshot", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);
    const analysis = buildEnergyAnalysis(snapshot);

    expect(analysis.highlights.find((item) => item.id === "peak"))
      .toEqual(
        expect.objectContaining({
          value: snapshot.metrics.peakConsumptionKwh,
        }),
      );
    expect(analysis.dataOrigin).toBe("estimated");
  });

  it("separa a análise estimada de Hoje da eficiência histórica", async () => {
    const service = new DashboardService(
      new MockDashboardRepository(),
      new DeviceService(new InMemoryDeviceRepository()),
    );
    const today = await service.getDashboard({
      period: "today",
      compare: false,
    });
    const history = await service.getDashboard({
      period: "7d",
      compare: false,
    });

    expect(today.energyAnalysis).toBeDefined();
    expect(today.alerts.every((alert) => alert.source === "advisor")).toBe(
      true,
    );
    expect(history.energyAnalysis).toBeUndefined();
    expect(history.periodEnergyAnalysis?.dataOrigin).toBe("simulated");
  });

  it("mantém origem estimada em Hoje e simulada no histórico", async () => {
    const service = new DashboardService(
      new MockDashboardRepository(),
      new DeviceService(
        new InMemoryDeviceRepository(createDemoDeviceRecords()),
      ),
    );
    const today = await service.getDashboard({
      period: "today",
      compare: true,
    });
    const history = await service.getDashboard({
      period: "30d",
      compare: true,
    });

    expect(
      today.alerts.every(
        (alert) => alert.dataOrigin === "estimated",
      ),
    ).toBe(true);
    expect(
      history.alerts.every(
        (alert) => alert.dataOrigin === "simulated",
      ),
    ).toBe(true);
  });
});

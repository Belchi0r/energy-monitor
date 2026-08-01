import { describe, expect, it } from "vitest";

import { demoDevices } from "@/lib/devices/demo-devices";
import {
  buildDeviceTimeline,
  buildTodayEnergySnapshot,
} from "@/lib/energy/energy-engine";
import type { EnergyDevice } from "@/lib/energy/energy-engine.types";

const activeDevice: EnergyDevice = {
  id: "lamp",
  name: "Lâmpada",
  category: "Iluminação",
  powerWatts: 100,
  averageDailyHours: 8,
  status: "active",
  usageProfileType: "CONTINUOUS",
  usageWindows: [{ startHour: 0, endHour: 24, weight: 1 }],
};

function allNumericValues(value: unknown): number[] {
  if (typeof value === "number") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(allNumericValues);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(allNumericValues);
  }

  return [];
}

describe("buildTodayEnergySnapshot", () => {
  it("produz estado vazio seguro para lista vazia", () => {
    const snapshot = buildTodayEnergySnapshot([]);

    expect(snapshot.activeDeviceCount).toBe(0);
    expect(snapshot.totalConsumptionKwh).toBe(0);
    expect(snapshot.estimatedDailyCost).toBe(0);
    expect(snapshot.distribution).toEqual([]);
    expect(snapshot.timeline).toHaveLength(12);
    expect(
      snapshot.timeline.every((point) => point.consumptionKwh === 0),
    ).toBe(true);
    expect(snapshot.metrics).toMatchObject({
      peakHour: null,
      minimumHour: null,
      peakConsumptionKwh: 0,
      minimumConsumptionKwh: 0,
    });
  });

  it("ignora todos os dispositivos inativos", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, status: "inactive" },
    ]);

    expect(snapshot.activeDeviceCount).toBe(0);
    expect(snapshot.distribution).toEqual([]);
    expect(snapshot.totalConsumptionKwh).toBe(0);
  });

  it("calcula exatamente potência vezes horas dividido por mil", () => {
    const snapshot = buildTodayEnergySnapshot([activeDevice]);

    expect(snapshot.totalConsumptionKwh).toBe(0.8);
    expect(snapshot.distribution[0].consumptionKwh).toBe(0.8);
  });

  it("atribui 100% e ranking 1 para um dispositivo ativo", () => {
    const snapshot = buildTodayEnergySnapshot([activeDevice]);

    expect(snapshot.distribution[0]).toMatchObject({
      deviceId: activeDevice.id,
      percentage: 100,
      ranking: 1,
    });
  });

  it("soma vários dispositivos usando a mesma distribuição", () => {
    const snapshot = buildTodayEnergySnapshot([
      activeDevice,
      {
        ...activeDevice,
        id: "heater",
        name: "Aquecedor",
        powerWatts: 1000,
        averageDailyHours: 2,
      },
    ]);
    const distributionTotal = snapshot.distribution.reduce(
      (total, device) => total + device.consumptionKwh,
      0,
    );

    expect(snapshot.totalConsumptionKwh).toBe(2.8);
    expect(distributionTotal).toBe(snapshot.totalConsumptionKwh);
  });

  it("mantém a soma da distribuição igual ao total calculado", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);
    const distributionTotal = snapshot.distribution.reduce(
      (total, device) => total + device.consumptionKwh,
      0,
    );

    expect(distributionTotal).toBe(snapshot.totalConsumptionKwh);
  });

  it("faz os percentuais somarem aproximadamente 100%", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);
    const percentageTotal = snapshot.distribution.reduce(
      (total, device) => total + device.percentage,
      0,
    );

    expect(percentageTotal).toBeCloseTo(100, 10);
  });

  it("ordena o ranking por consumo decrescente", () => {
    const snapshot = buildTodayEnergySnapshot([
      activeDevice,
      {
        ...activeDevice,
        id: "high",
        name: "Maior",
        powerWatts: 2000,
      },
      {
        ...activeDevice,
        id: "zero",
        name: "Sem uso",
        averageDailyHours: 0,
      },
    ]);

    expect(
      snapshot.distribution.map((device) => ({
        id: device.deviceId,
        ranking: device.ranking,
      })),
    ).toEqual([
      { id: "high", ranking: 1 },
      { id: "lamp", ranking: 2 },
      { id: "zero", ranking: 3 },
    ]);
  });

  it("faz a timeline somar exatamente o total diário", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);
    const timelineTotal = snapshot.timeline.reduce(
      (total, point) => total + point.consumptionKwh,
      0,
    );

    expect(timelineTotal).toBe(snapshot.totalConsumptionKwh);
  });

  it("faz cada timeline individual somar exatamente seu consumo", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);

    for (const device of snapshot.deviceTimelines) {
      const intervalTotal = device.intervals.reduce(
        (total, interval) => total + interval.consumptionKwh,
        0,
      );

      expect(intervalTotal).toBe(device.totalConsumptionKwh);
    }
  });

  it("normaliza pesos personalizados antes de distribuir o consumo", () => {
    const timeline = buildDeviceTimeline({
      ...activeDevice,
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 8, endHour: 10, weight: 2 },
        { startHour: 18, endHour: 20, weight: 6 },
      ],
    });

    expect(timeline.intervals[4].consumptionKwh).toBeCloseTo(0.2);
    expect(timeline.intervals[9].consumptionKwh).toBeCloseTo(0.6);
    expect(
      timeline.intervals.reduce(
        (total, interval) => total + interval.consumptionKwh,
        0,
      ),
    ).toBe(timeline.totalConsumptionKwh);
  });

  it("calcula pico, mínimo e média pela curva normalizada", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);

    expect(snapshot.metrics.peakHour).toBe("20h");
    expect(snapshot.metrics.minimumHour).toBe("00h");
    expect(snapshot.metrics.peakConsumptionKwh).toBeGreaterThan(
      snapshot.metrics.averageConsumptionKwh,
    );
    expect(snapshot.metrics.minimumConsumptionKwh).toBeLessThan(
      snapshot.metrics.averageConsumptionKwh,
    );
    expect(snapshot.metrics.averageConsumptionKwh).toBe(
      snapshot.totalConsumptionKwh / snapshot.timeline.length,
    );
  });

  it("explica o pico com no máximo dois contribuintes relevantes", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);

    expect(snapshot.metrics.peakHour).toBe("20h");
    expect(snapshot.peakContributors.map((item) => item.name)).toEqual([
      "Ar-condicionado",
      "Chuveiro elétrico",
    ]);
    expect(snapshot.peakContributors).toHaveLength(2);
    expect(
      snapshot.peakContributors.every(
        (item) => item.percentageOfPeak >= 10,
      ),
    ).toBe(true);
  });

  it("calcula o consumo após as 18h pelo mesmo total", () => {
    const snapshot = buildTodayEnergySnapshot(demoDevices);
    const eveningTotal = snapshot.timeline
      .filter((point) => Number.parseInt(point.hour, 10) >= 18)
      .reduce((total, point) => total + point.consumptionKwh, 0);

    expect(snapshot.metrics.eveningConsumptionKwh).toBe(eveningTotal);
    expect(snapshot.metrics.eveningPercentage).toBeCloseTo(
      (eveningTotal / snapshot.totalConsumptionKwh) * 100,
      12,
    );
  });

  it("limita horas acima de 24", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, averageDailyHours: 30 },
    ]);

    expect(snapshot.distribution[0].averageDailyHours).toBe(24);
    expect(snapshot.totalConsumptionKwh).toBeCloseTo(2.4);
  });

  it("normaliza horas negativas para zero", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, averageDailyHours: -3 },
    ]);

    expect(snapshot.totalConsumptionKwh).toBe(0);
  });

  it("normaliza potência negativa para zero", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, powerWatts: -100 },
    ]);

    expect(snapshot.totalConsumptionKwh).toBe(0);
  });

  it("mantém valores zero sem criar consumo ou pico falso", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, powerWatts: 0, averageDailyHours: 0 },
    ]);

    expect(snapshot.totalConsumptionKwh).toBe(0);
    expect(snapshot.metrics.peakHour).toBeNull();
    expect(snapshot.distribution[0].percentage).toBe(0);
    expect(snapshot.peakContributors).toEqual([]);
  });

  it("recupera dado legado com perfil inválido sem lançar erro", () => {
    const snapshot = buildTodayEnergySnapshot([
      {
        ...activeDevice,
        category: "Categoria desconhecida",
        usageProfileType: "INVALID",
        usageWindows: [{ startHour: 20, endHour: 5, weight: -1 }],
      },
    ]);

    expect(snapshot.totalConsumptionKwh).toBe(0.8);
    expect(
      snapshot.timeline.every((point) =>
        Number.isFinite(point.consumptionKwh),
      ),
    ).toBe(true);
  });

  it("não produz NaN com valores inválidos", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, powerWatts: Number.NaN },
      {
        ...activeDevice,
        id: "infinite",
        powerWatts: Number.POSITIVE_INFINITY,
        averageDailyHours: Number.NEGATIVE_INFINITY,
      },
    ]);

    expect(
      allNumericValues(snapshot).every((value) => !Number.isNaN(value)),
    ).toBe(true);
  });

  it("mantém valores altos finitos sem limite artificial", () => {
    const snapshot = buildTodayEnergySnapshot([
      { ...activeDevice, powerWatts: 1_000_000_000, averageDailyHours: 24 },
    ]);

    expect(snapshot.totalConsumptionKwh).toBe(24_000_000);
  });

  it("é determinístico para a mesma entrada", () => {
    expect(buildTodayEnergySnapshot(demoDevices)).toEqual(
      buildTodayEnergySnapshot(demoDevices),
    );
  });

  it("calcula custos diário e mensal e projeção de 30 dias", () => {
    const snapshot = buildTodayEnergySnapshot([activeDevice]);

    expect(snapshot.estimatedDailyCost).toBe(0.67);
    expect(snapshot.estimatedMonthlyConsumptionKwh).toBe(24);
    expect(snapshot.estimatedMonthlyCost).toBe(20.16);
  });

  it("recalcula somente valores financeiros com a tarifa recebida", () => {
    const defaultTariff = buildTodayEnergySnapshot(
      [activeDevice],
      0.84,
    );
    const customTariff = buildTodayEnergySnapshot(
      [activeDevice],
      1,
    );

    expect(customTariff.estimatedDailyCost).toBe(0.8);
    expect(customTariff.estimatedMonthlyCost).toBe(24);
    expect(customTariff.totalConsumptionKwh).toBe(
      defaultTariff.totalConsumptionKwh,
    );
    expect(customTariff.estimatedMonthlyConsumptionKwh).toBe(
      defaultTariff.estimatedMonthlyConsumptionKwh,
    );
    expect(customTariff.timeline).toEqual(defaultTariff.timeline);
    expect(customTariff.distribution).toEqual(
      defaultTariff.distribution,
    );
  });

  it("não altera o array nem os dispositivos recebidos", () => {
    const devices = structuredClone(demoDevices);
    const original = structuredClone(devices);

    buildTodayEnergySnapshot(devices);

    expect(devices).toEqual(original);
  });
});

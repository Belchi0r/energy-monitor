import { describe, expect, it } from "vitest";

import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";
import { formatMetricNumber } from "@/lib/dashboard/formatters";
import {
  energyTariffValueSchema,
  formatEnergyTariffInput,
  resolveEffectiveEnergyTariff,
  serializeEnergyTariff,
} from "@/lib/energy/energy-tariff";

describe("tarifa de energia", () => {
  it.each([
    ["0,84", 0.84],
    ["1,00", 1],
    ["1,25", 1.25],
    ["0.95", 0.95],
  ])("aceita a entrada %s", (input, expected) => {
    expect(energyTariffValueSchema.parse(input)).toBe(expected);
  });

  it.each([
    "",
    "texto",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "0,001",
    "1.000,00",
    "10.01",
  ])("rejeita a entrada %s", (input) => {
    expect(energyTariffValueSchema.safeParse(input).success).toBe(
      false,
    );
  });

  it.each([
    undefined,
    "corrompido",
    "0",
    "-0.5",
    "10.01",
    "Infinity",
  ])("usa a tarifa padrão para cookie inválido %s", (cookieValue) => {
    expect(resolveEffectiveEnergyTariff(cookieValue)).toBe(
      DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
    );
  });

  it("mantém número no domínio e formata a apresentação em pt-BR", () => {
    const tariff = resolveEffectiveEnergyTariff("1.00");

    expect(tariff).toBe(1);
    expect(typeof tariff).toBe("number");
    expect(formatEnergyTariffInput(tariff)).toBe("1,00");
    expect(serializeEnergyTariff(tariff)).toBe("1");
    expect(
      formatMetricNumber(
        DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
        "currency",
      ).value,
    ).toContain("0,84");
  });
});

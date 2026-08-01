import { z } from "zod";

import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";

export const ENERGY_TARIFF_COOKIE_NAME =
  "energy-monitor.energy-tariff";
export const ENERGY_TARIFF_COOKIE_MAX_AGE_SECONDS =
  60 * 60 * 24 * 365;
export const MIN_ENERGY_TARIFF_BRL_PER_KWH = 0.01;
export const MAX_ENERGY_TARIFF_BRL_PER_KWH = 10;

const tariffInputPattern = /^\d+(?:[.,]\d{1,2})?$/;

const tariffNumberSchema = z
  .number()
  .finite("Informe uma tarifa válida.")
  .min(
    MIN_ENERGY_TARIFF_BRL_PER_KWH,
    "A tarifa deve ser maior que zero.",
  )
  .max(
    MAX_ENERGY_TARIFF_BRL_PER_KWH,
    `A tarifa deve ser de no máximo R$ ${MAX_ENERGY_TARIFF_BRL_PER_KWH.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/kWh.`,
  )
  .refine(
    (value) =>
      Math.abs(value * 100 - Math.round(value * 100)) <
      Number.EPSILON * 100,
    "Use no máximo duas casas decimais.",
  );

export const energyTariffValueSchema = z.union([
  z
    .string()
    .trim()
    .min(1, "Informe a tarifa de energia.")
    .regex(
      tariffInputPattern,
      "Use um número com até duas casas decimais, como 0,84.",
    )
    .transform((value) => Number(value.replace(",", ".")))
    .pipe(tariffNumberSchema),
  tariffNumberSchema,
]);

export const energyTariffRequestSchema = z
  .object({
    tariff: energyTariffValueSchema,
  })
  .strict();

const tariffInputFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function resolveEffectiveEnergyTariff(value: unknown) {
  const result = energyTariffValueSchema.safeParse(value);

  return result.success
    ? result.data
    : DEFAULT_ENERGY_TARIFF_BRL_PER_KWH;
}

export function formatEnergyTariffInput(value: number) {
  return tariffInputFormatter.format(
    resolveEffectiveEnergyTariff(value),
  );
}

export function serializeEnergyTariff(value: number) {
  return String(resolveEffectiveEnergyTariff(value));
}

import type { EnergyDevice } from "@/lib/energy/energy-engine.types";

const CURRENCY_DECIMAL_FACTOR = 100;
const MAX_DAILY_HOURS = 24;

export function toSafeNonNegative(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function normalizeAverageDailyHours(value: number) {
  return Math.min(toSafeNonNegative(value), MAX_DAILY_HOURS);
}

export function calculateDeviceConsumptionKwh(
  device: Pick<EnergyDevice, "powerWatts" | "averageDailyHours">,
) {
  const powerWatts = toSafeNonNegative(device.powerWatts);
  const averageDailyHours = normalizeAverageDailyHours(
    device.averageDailyHours,
  );
  const consumptionKwh =
    (powerWatts / 1000) * averageDailyHours;

  return Number.isFinite(consumptionKwh) ? consumptionKwh : 0;
}

export function normalizeMonetaryValue(value: number) {
  const safeValue = toSafeNonNegative(value);

  return (
    Math.round(
      (safeValue + Number.EPSILON) * CURRENCY_DECIMAL_FACTOR,
    ) / CURRENCY_DECIMAL_FACTOR
  );
}

export function parseHour(hour: string) {
  const parsedHour = Number.parseInt(hour, 10);

  return Number.isFinite(parsedHour) ? parsedHour : 0;
}

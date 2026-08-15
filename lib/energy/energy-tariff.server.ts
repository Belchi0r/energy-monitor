import { cookies } from "next/headers";

import {
  ENERGY_TARIFF_COOKIE_NAME,
  resolveEffectiveEnergyTariff,
} from "@/lib/energy/energy-tariff";
import { energyHistoryRepository } from "@/lib/history-application";

export async function getEffectiveEnergyTariff(userId: string) {
  const persistedSnapshot =
    await energyHistoryRepository.findLatest(userId);

  if (persistedSnapshot) {
    return resolveEffectiveEnergyTariff(
      persistedSnapshot.tariffBrlPerKwh,
    );
  }

  const cookieStore = await cookies();

  return resolveEffectiveEnergyTariff(
    cookieStore.get(ENERGY_TARIFF_COOKIE_NAME)?.value,
  );
}

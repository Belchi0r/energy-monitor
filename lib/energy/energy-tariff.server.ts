import { cookies } from "next/headers";

import {
  ENERGY_TARIFF_COOKIE_NAME,
  resolveEffectiveEnergyTariff,
} from "@/lib/energy/energy-tariff";

export async function getEffectiveEnergyTariff() {
  const cookieStore = await cookies();

  return resolveEffectiveEnergyTariff(
    cookieStore.get(ENERGY_TARIFF_COOKIE_NAME)?.value,
  );
}

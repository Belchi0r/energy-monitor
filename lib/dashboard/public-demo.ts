import "server-only";

import type { DashboardPeriod } from "@/lib/dashboard/types";
import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";
import { MockDashboardRepository } from "@/lib/repositories/mock-dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";

const privateDeviceBoundary = {
  async listDevices(): Promise<never> {
    throw new Error(
      "A demonstração pública não pode acessar dispositivos de usuários.",
    );
  },
};

const publicDemoDashboardService = new DashboardService(
  new MockDashboardRepository(),
  privateDeviceBoundary,
);

type PublicDemoDashboardQuery = {
  period: DashboardPeriod;
  compare: boolean;
};

export function getPublicDemoDashboard(
  query: PublicDemoDashboardQuery,
) {
  return publicDemoDashboardService.getDashboard(
    {
      ...query,
      mode: "demo",
    },
    "public-demo-readonly",
    DEFAULT_ENERGY_TARIFF_BRL_PER_KWH,
  );
}

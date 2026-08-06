import { describe, expect, it } from "vitest";

import { dashboardDatasets } from "@/lib/dashboard/datasets";
import type {
  DashboardDataset,
  DashboardDatasetId,
  DashboardPeriod,
} from "@/lib/dashboard/types";
import type { DashboardRepository } from "@/lib/repositories/dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";
import { DeviceService } from "@/lib/services/device-service";
import {
  createDemoDeviceRecords,
  InMemoryDeviceRepository,
  OTHER_USER_ID,
  TEST_USER_ID,
} from "@/tests/device-test-helpers";

class RecordingDashboardRepository implements DashboardRepository {
  readonly calls: DashboardDatasetId[] = [];

  constructor(
    private readonly datasets: Readonly<
      Record<DashboardDatasetId, DashboardDataset>
    > = dashboardDatasets,
  ) {}

  async getDataset(id: DashboardDatasetId) {
    this.calls.push(id);
    return this.datasets[id];
  }
}

function createSubject(
  deviceRepository = new InMemoryDeviceRepository(),
) {
  const repository = new RecordingDashboardRepository();
  const service = new DashboardService(
    repository,
    new DeviceService(deviceRepository),
  );

  return { repository, service };
}

describe("DashboardService", () => {
  it("usa somente os dispositivos do usuário em home Hoje", async () => {
    const { repository, service } = createSubject();

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      TEST_USER_ID,
    );

    expect(repository.calls).toEqual([]);
    expect(result).toEqual(
      expect.objectContaining({
        mode: "home",
        dataOrigin: "user-devices",
        comparisonAvailable: false,
        historyAvailable: false,
        emptyState: null,
        activities: [],
      }),
    );
    expect(result.timeline.items).toEqual([]);
    expect(result.deviceAnalysis.items).toHaveLength(5);
    expect(
      result.alerts.every(
        (alert) =>
          alert.source === "advisor" &&
          alert.dataOrigin === "estimated",
      ),
    ).toBe(true);
  });

  it("não usa ontem simulado na comparação residencial", async () => {
    const { repository, service } = createSubject();

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: true },
      TEST_USER_ID,
    );

    expect(repository.calls).toEqual([]);
    expect(result.compare).toBe(false);
    expect(result.comparisonAvailable).toBe(false);
    expect(result.previousLabel).toBeUndefined();
    expect(result.temporalAnalysis.previousTotalKwh).toBeUndefined();
    expect(
      result.metrics.every((metric) => metric.comparison === undefined),
    ).toBe(true);
  });

  it("retorna onboarding e conteúdo vazio para usuário sem dispositivos", async () => {
    const { repository, service } = createSubject(
      new InMemoryDeviceRepository([]),
    );

    const result = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      TEST_USER_ID,
    );
    const serialized = JSON.stringify(result);

    expect(repository.calls).toEqual([]);
    expect(result.emptyState).toEqual({
      kind: "no-devices",
      title: "Comece cadastrando seu primeiro dispositivo",
      description:
        "Adicione os equipamentos da sua residência para gerar estimativas de consumo, custo e recomendações.",
    });
    expect(result.activities).toEqual([]);
    expect(result.timeline.items).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.temporalAnalysis.points).toEqual([]);
    expect(result.deviceAnalysis.items).toEqual([]);
    expect(result.metrics.every((metric) => metric.value === 0)).toBe(true);
    expect(serialized).not.toMatch(/Ar-condicionado|Geladeira|Chuveiro/);
  });

  it.each(["7d", "30d"] as const)(
    "não consulta nem exibe datasets globais em home %s",
    async (period) => {
      const { repository, service } = createSubject();

      const result = await service.getDashboard(
        { mode: "home", period, compare: true },
        TEST_USER_ID,
      );

      expect(repository.calls).toEqual([]);
      expect(result.emptyState).toEqual(
        expect.objectContaining({
          kind: "historical-unavailable",
          title:
            "Ainda não existem medições históricas para esta residência.",
        }),
      );
      expect(result.metrics).toEqual([]);
      expect(result.temporalAnalysis.points).toEqual([]);
      expect(result.deviceAnalysis.items).toEqual([]);
      expect(result.alerts).toEqual([]);
      expect(result.timeline.items).toEqual([]);
      expect(result.activities).toEqual([]);
      expect(result.compare).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(
        /Ar-condicionado|Geladeira|Chuveiro/,
      );
    },
  );

  it.each(["today", "7d", "30d"] as const)(
    "carrega somente os datasets globais em demo %s",
    async (period: DashboardPeriod) => {
      const repository = new RecordingDashboardRepository();
      const service = new DashboardService(repository, {
        listDevices: async () => {
          throw new Error("demo não deve consultar dispositivos reais");
        },
      });

      const result = await service.getDashboard(
        { mode: "demo", period, compare: false },
        TEST_USER_ID,
      );

      expect(result.mode).toBe("demo");
      expect(result.dataOrigin).toBe("global-demo");
      expect(result.deviceDataSource).toBe("simulated-snapshot");
      expect(result.emptyState).toBeNull();
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(
        result.alerts.every(
          (alert) => alert.dataOrigin === "simulated",
        ),
      ).toBe(true);
      expect(repository.calls).toEqual(
        period === "today"
          ? ["today"]
          : period === "7d"
            ? ["last7Days", "previous7Days"]
            : ["last30Days", "previous30Days"],
      );
    },
  );

  it("preserva a comparação demonstrativa com datasets globais", async () => {
    const repository = new RecordingDashboardRepository();
    const service = new DashboardService(repository, {
      listDevices: async () => [],
    });

    const result = await service.getDashboard(
      { mode: "demo", period: "today", compare: true },
      TEST_USER_ID,
    );

    expect(repository.calls).toEqual(["today", "yesterday"]);
    expect(result.compare).toBe(true);
    expect(result.comparisonAvailable).toBe(true);
    expect(result.previousLabel).toBe("Ontem");
    expect(result.temporalAnalysis.previousTotalKwh).toBeDefined();
  });

  it("mantém o isolamento entre usuários no modo residencial", async () => {
    const firstUserDevices = createDemoDeviceRecords(TEST_USER_ID).slice(0, 2);
    const secondUserDevices = createDemoDeviceRecords(OTHER_USER_ID).slice(0, 1);
    const { service } = createSubject(
      new InMemoryDeviceRepository([
        ...firstUserDevices,
        ...secondUserDevices,
      ]),
    );

    const firstUser = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      TEST_USER_ID,
    );
    const secondUser = await service.getDashboard(
      { mode: "home", period: "today", compare: false },
      OTHER_USER_ID,
    );

    expect(firstUser.deviceAnalysis.items).toHaveLength(2);
    expect(secondUser.deviceAnalysis.items).toHaveLength(1);
    expect(
      firstUser.metrics.find((metric) => metric.id === "activeDevices")
        ?.value,
    ).toBe(2);
    expect(
      secondUser.metrics.find((metric) => metric.id === "activeDevices")
        ?.value,
    ).toBe(1);
  });
});

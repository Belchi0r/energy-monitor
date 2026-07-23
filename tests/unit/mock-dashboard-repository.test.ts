import { describe, expect, it } from "vitest";

import { dashboardDatasets } from "@/lib/dashboard/datasets";
import type { DashboardDatasetId } from "@/lib/dashboard/types";
import { MockDashboardRepository } from "@/lib/repositories/mock-dashboard-repository";

const datasetCases = [
  ["today", "today"],
  ["yesterday", "yesterday"],
  ["last7Days", "last7Days"],
  ["previous7Days", "previous7Days"],
  ["last30Days", "last30Days"],
  ["previous30Days", "previous30Days"],
] as const satisfies readonly [
  DashboardDatasetId,
  DashboardDatasetId,
][];

describe("MockDashboardRepository", () => {
  it.each(datasetCases)("retorna o dataset %s", async (id, expectedId) => {
    const repository = new MockDashboardRepository();

    const dataset = await repository.getDataset(id);

    expect(dataset.id).toBe(expectedId);
    expect(dataset).toEqual(dashboardDatasets[id]);
  });

  it("mantém um contrato assíncrono", async () => {
    const repository = new MockDashboardRepository();

    const pendingDataset = repository.getDataset("today");

    expect(pendingDataset).toBeInstanceOf(Promise);
    await expect(pendingDataset).resolves.toBe(dashboardDatasets.today);
  });

  it("falha explicitamente para um ID inexistente em runtime", async () => {
    const repository = new MockDashboardRepository();
    const invalidId = "missing" as DashboardDatasetId;

    await expect(repository.getDataset(invalidId)).rejects.toThrow(
      /não encontrado/i,
    );
  });

  it("não altera os dados originais ao buscar um dataset", async () => {
    const repository = new MockDashboardRepository();
    const originalDataset = structuredClone(dashboardDatasets.today);

    await repository.getDataset("today");

    expect(dashboardDatasets.today).toEqual(originalDataset);
  });

  it("mantém chamadas consecutivas consistentes", async () => {
    const repository = new MockDashboardRepository();

    const firstResult = await repository.getDataset("last30Days");
    const secondResult = await repository.getDataset("last30Days");

    expect(secondResult).toEqual(firstResult);
    expect(secondResult.id).toBe("last30Days");
  });
});

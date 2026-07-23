import { NextRequest } from "next/server";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { GET } from "@/app/api/dashboard/route";
import { dashboardService } from "@/lib/dashboard/application";
import type { DashboardPeriod } from "@/lib/dashboard/types";
import type {
  DashboardApiErrorResponse,
  DashboardApiSuccessResponse,
} from "@/lib/types/dashboard-api";

type SuccessCase = {
  name: string;
  query: string;
  period: DashboardPeriod;
  compare: boolean;
};

const successCases = [
  {
    name: "defaults",
    query: "",
    period: "today",
    compare: false,
  },
  {
    name: "today",
    query: "?period=today",
    period: "today",
    compare: false,
  },
  {
    name: "today com comparação",
    query: "?period=today&compare=true",
    period: "today",
    compare: true,
  },
  {
    name: "sete dias",
    query: "?period=7d",
    period: "7d",
    compare: false,
  },
  {
    name: "sete dias com comparação",
    query: "?period=7d&compare=true",
    period: "7d",
    compare: true,
  },
  {
    name: "trinta dias",
    query: "?period=30d",
    period: "30d",
    compare: false,
  },
  {
    name: "trinta dias com comparação",
    query: "?period=30d&compare=true",
    period: "30d",
    compare: true,
  },
  {
    name: "compare=false explícito",
    query: "?period=today&compare=false",
    period: "today",
    compare: false,
  },
] as const satisfies readonly SuccessCase[];

const invalidCases = [
  ["período inválido", "?period=year"],
  ["período vazio", "?period="],
  ["comparação inválida", "?compare=yes"],
  ["período repetido", "?period=today&period=7d"],
  ["comparação repetida", "?compare=true&compare=false"],
  ["parâmetro desconhecido", "?unexpected=value"],
] as const;

function createRequest(query = "") {
  return new NextRequest(
    `http://localhost/api/dashboard${query}`,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/dashboard", () => {
  it.each(successCases)(
    "retorna HTTP 200 para $name",
    async ({ query, period, compare }) => {
      const response = await GET(createRequest(query));
      const body =
        (await response.json()) as DashboardApiSuccessResponse;

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(body.data).toEqual(
        expect.objectContaining({
          period,
          compare,
          metrics: expect.any(Array),
        }),
      );
      expect(body.meta.period).toBe(period);
      expect(body.meta.compare).toBe(compare);
      expect(Number.isNaN(Date.parse(body.meta.generatedAt))).toBe(false);
    },
  );

  it("gera generatedAt determinístico com relógio controlado", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T15:00:00.000Z"));

    const response = await GET(createRequest());
    const body =
      (await response.json()) as DashboardApiSuccessResponse;

    expect(body.meta.generatedAt).toBe("2026-07-23T15:00:00.000Z");
  });

  it.each(invalidCases)(
    "retorna HTTP 400 para %s",
    async (_caseName, query) => {
      const response = await GET(createRequest(query));
      const body =
        (await response.json()) as DashboardApiErrorResponse;
      const serializedBody = JSON.stringify(body);

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(body.error.code).toBe("INVALID_QUERY");
      expect(body.error.details?.length).toBeGreaterThan(0);
      expect(serializedBody).not.toMatch(/stack|node_modules/i);
    },
  );

  it("retorna HTTP 500 sem expor detalhes internos", async () => {
    vi.spyOn(dashboardService, "getDashboard").mockRejectedValueOnce(
      new Error("falha interna sensível"),
    );

    const response = await GET(createRequest());
    const body =
      (await response.json()) as DashboardApiErrorResponse;
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain(
      "application/json",
    );
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.details).toBeUndefined();
    expect(serializedBody).not.toMatch(
      /falha interna sensível|stack|node_modules/i,
    );
  });
});

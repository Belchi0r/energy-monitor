import { NextRequest } from "next/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { GET } from "@/app/api/dashboard/route";
import type {
  DashboardDataMode,
  DashboardPeriod,
} from "@/lib/dashboard/types";
import { MockDashboardRepository } from "@/lib/repositories/mock-dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";
import { DeviceService } from "@/lib/services/device-service";
import type {
  DashboardApiErrorResponse,
  DashboardApiSuccessResponse,
} from "@/lib/types/dashboard-api";
import {
  InMemoryDeviceRepository,
  TEST_USER_ID,
} from "@/tests/device-test-helpers";

const {
  getDashboardMock,
  getEffectiveEnergyTariffMock,
  requireUserMock,
} = vi.hoisted(() => ({
  getDashboardMock: vi.fn<DashboardService["getDashboard"]>(),
  getEffectiveEnergyTariffMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("@/lib/dashboard/application", () => ({
  dashboardService: {
    getDashboard: getDashboardMock,
  },
}));

vi.mock("@/lib/energy/energy-tariff.server", () => ({
  getEffectiveEnergyTariff: getEffectiveEnergyTariffMock,
}));

vi.mock("@/lib/supabase/require-user", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/supabase/require-user")
  >();

  return {
    ...original,
    requireUser: requireUserMock,
  };
});

const mockBackedDashboardService = new DashboardService(
  new MockDashboardRepository(),
  new DeviceService(new InMemoryDeviceRepository()),
);

type SuccessCase = {
  name: string;
  query: string;
  period: DashboardPeriod;
  compare: boolean;
  mode: DashboardDataMode;
};

const successCases = [
  {
    name: "defaults",
    query: "",
    period: "today",
    compare: false,
    mode: "home",
  },
  {
    name: "today",
    query: "?period=today",
    period: "today",
    compare: false,
    mode: "home",
  },
  {
    name: "today com comparação",
    query: "?period=today&compare=true",
    period: "today",
    compare: true,
    mode: "home",
  },
  {
    name: "sete dias",
    query: "?period=7d",
    period: "7d",
    compare: false,
    mode: "home",
  },
  {
    name: "sete dias com comparação",
    query: "?period=7d&compare=true",
    period: "7d",
    compare: true,
    mode: "home",
  },
  {
    name: "trinta dias",
    query: "?period=30d",
    period: "30d",
    compare: false,
    mode: "home",
  },
  {
    name: "trinta dias com comparação",
    query: "?period=30d&compare=true",
    period: "30d",
    compare: true,
    mode: "home",
  },
  {
    name: "compare=false explícito",
    query: "?period=today&compare=false",
    period: "today",
    compare: false,
    mode: "home",
  },
  {
    name: "demonstração",
    query: "?mode=demo&period=today",
    period: "today",
    compare: false,
    mode: "demo",
  },
  {
    name: "modo inválido normalizado",
    query: "?mode=externo&period=today",
    period: "today",
    compare: false,
    mode: "home",
  },
] as const satisfies readonly SuccessCase[];

const invalidCases = [
  ["período inválido", "?period=year"],
  ["período vazio", "?period="],
  ["comparação inválida", "?compare=yes"],
  ["período repetido", "?period=today&period=7d"],
  ["comparação repetida", "?compare=true&compare=false"],
  ["modo repetido", "?mode=home&mode=demo"],
  ["parâmetro desconhecido", "?unexpected=value"],
] as const;

function createRequest(query = "") {
  return new NextRequest(
    `http://localhost/api/dashboard${query}`,
  );
}

beforeEach(() => {
  getDashboardMock.mockReset();
  getEffectiveEnergyTariffMock.mockReset();
  requireUserMock.mockReset();
  getEffectiveEnergyTariffMock.mockResolvedValue(0.84);
  requireUserMock.mockResolvedValue({ id: TEST_USER_ID });
  getDashboardMock.mockImplementation((query, userId, tariffBrlPerKwh) =>
    mockBackedDashboardService.getDashboard(
      query,
      userId,
      tariffBrlPerKwh,
    ),
  );
});

afterEach(() => {
  getDashboardMock.mockReset();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/dashboard", () => {
  it.each(successCases)(
    "retorna HTTP 200 para $name",
    async ({ query, period, compare, mode }) => {
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
          mode,
          metrics: expect.any(Array),
        }),
      );
      expect(body.meta.period).toBe(period);
      expect(body.meta.compare).toBe(compare);
      expect(body.meta.mode).toBe(mode);
      expect(Number.isNaN(Date.parse(body.meta.generatedAt))).toBe(false);
      expect(getDashboardMock).toHaveBeenCalledWith(
        { period, compare, mode },
        TEST_USER_ID,
        0.84,
      );
      expect(getEffectiveEnergyTariffMock).toHaveBeenCalledWith(
        TEST_USER_ID,
      );
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
    getDashboardMock.mockRejectedValueOnce(
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

  it("retorna HTTP 401 sem sessão e não acessa o service", async () => {
    const { AuthenticationRequiredError } = await import(
      "@/lib/supabase/require-user"
    );
    requireUserMock.mockRejectedValueOnce(
      new AuthenticationRequiredError(),
    );

    const response = await GET(createRequest());
    const body =
      (await response.json()) as DashboardApiErrorResponse;

    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: "UNAUTHORIZED",
      message: "Autenticação necessária.",
    });
    expect(getDashboardMock).not.toHaveBeenCalled();
  });
});

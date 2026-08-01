import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { getCookieMock } = vi.hoisted(() => ({
  getCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: getCookieMock,
  })),
}));

import { POST } from "@/app/api/settings/energy-tariff/route";
import { DEFAULT_ENERGY_TARIFF_BRL_PER_KWH } from "@/lib/energy/energy-engine.constants";
import {
  ENERGY_TARIFF_COOKIE_NAME,
  resolveEffectiveEnergyTariff,
} from "@/lib/energy/energy-tariff";
import { getEffectiveEnergyTariff } from "@/lib/energy/energy-tariff.server";

function createRequest(tariff: unknown) {
  return new Request(
    "http://localhost/api/settings/energy-tariff",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tariff }),
    },
  );
}

beforeEach(() => {
  getCookieMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("persistência server-side da tarifa", () => {
  it.each([
    [undefined, DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
    ["1.25", 1.25],
    ["inválido", DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
    ["0", DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
    ["10.01", DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
  ])(
    "resolve o cookie %s como %s",
    async (cookieValue, expected) => {
      getCookieMock.mockReturnValue(
        cookieValue === undefined
          ? undefined
          : { value: cookieValue },
      );

      await expect(getEffectiveEnergyTariff()).resolves.toBe(
        expected,
      );
    },
  );

  it("salva valor normalizado em cookie HttpOnly e o relê após reload", async () => {
    const response = await POST(createRequest("1,00"));
    const body = (await response.json()) as {
      success: boolean;
      tariff: number;
      tariffInput: string;
    };
    const cookieValue =
      response.headers
        .get("set-cookie")
        ?.match(
          new RegExp(
            `${ENERGY_TARIFF_COOKIE_NAME.replace(".", "\\.")}=([^;]+)`,
          ),
        )?.[1] ?? "";

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      tariff: 1,
      tariffInput: "1,00",
      message: "Tarifa salva neste navegador.",
    });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain(
      "SameSite=lax",
    );
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    expect(resolveEffectiveEnergyTariff(cookieValue)).toBe(1);

    getCookieMock.mockReturnValue({ value: cookieValue });
    await expect(getEffectiveEnergyTariff()).resolves.toBe(1);
  });

  it.each(["", "texto", "0", "-1", "NaN", "Infinity", "10.01"])(
    "retorna 400 sem cookie para %s",
    async (tariff) => {
      const response = await POST(createRequest(tariff));
      const body = (await response.json()) as {
        success: boolean;
        message: string;
      };

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBeTruthy();
      expect(response.headers.get("set-cookie")).toBeNull();
    },
  );
});

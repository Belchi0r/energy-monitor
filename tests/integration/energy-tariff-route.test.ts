import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  captureCurrentDayMock,
  findLatestMock,
  getCookieMock,
  listDevicesMock,
  requireUserMock,
} = vi.hoisted(() => ({
  captureCurrentDayMock: vi.fn(),
  findLatestMock: vi.fn(),
  getCookieMock: vi.fn(),
  listDevicesMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: getCookieMock,
  })),
}));

vi.mock("@/lib/devices/application", () => ({
  deviceService: {
    listDevices: listDevicesMock,
  },
}));

vi.mock("@/lib/history-application", () => ({
  energyHistoryRepository: {
    findLatest: findLatestMock,
  },
  energyHistoryService: {
    captureCurrentDay: captureCurrentDayMock,
  },
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
  captureCurrentDayMock.mockReset();
  findLatestMock.mockReset();
  getCookieMock.mockReset();
  listDevicesMock.mockReset();
  requireUserMock.mockReset();
  captureCurrentDayMock.mockResolvedValue(undefined);
  findLatestMock.mockResolvedValue(null);
  listDevicesMock.mockResolvedValue([]);
  requireUserMock.mockResolvedValue({ id: "authenticated-user" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("persistência server-side da tarifa", () => {
  it("faz a tarifa persistida prevalecer sobre o default em um novo login", async () => {
    findLatestMock.mockResolvedValue({ tariffBrlPerKwh: 5 });
    getCookieMock.mockReturnValue(undefined);

    await expect(
      getEffectiveEnergyTariff("authenticated-user"),
    ).resolves.toBe(5);
    expect(findLatestMock).toHaveBeenCalledWith("authenticated-user");
  });

  it("retorna a tarifa persistida em outro cliente mesmo com cookie local desatualizado", async () => {
    findLatestMock.mockResolvedValue({ tariffBrlPerKwh: 5 });
    getCookieMock.mockReturnValue({ value: "0.84" });

    await expect(
      getEffectiveEnergyTariff("authenticated-user"),
    ).resolves.toBe(5);
    expect(getCookieMock).not.toHaveBeenCalled();
  });

  it("mantém a tarifa da conta entre leituras de sessões diferentes", async () => {
    findLatestMock.mockResolvedValue({ tariffBrlPerKwh: 5 });

    await expect(
      getEffectiveEnergyTariff("authenticated-user"),
    ).resolves.toBe(5);
    await expect(
      getEffectiveEnergyTariff("authenticated-user"),
    ).resolves.toBe(5);
    expect(findLatestMock).toHaveBeenCalledTimes(2);
  });

  it("usa o default somente quando não existe snapshot nem cookie", async () => {
    findLatestMock.mockResolvedValue(null);
    getCookieMock.mockReturnValue(undefined);

    await expect(
      getEffectiveEnergyTariff("authenticated-user"),
    ).resolves.toBe(DEFAULT_ENERGY_TARIFF_BRL_PER_KWH);
  });

  it.each([
    ["1.25", 1.25],
    ["inválido", DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
    ["0", DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
    ["10.01", DEFAULT_ENERGY_TARIFF_BRL_PER_KWH],
  ])(
    "mantém o cookie %s como fallback compatível sem snapshot",
    async (cookieValue, expected) => {
      getCookieMock.mockReturnValue({ value: cookieValue });

      await expect(
        getEffectiveEnergyTariff("authenticated-user"),
      ).resolves.toBe(expected);
    },
  );

  it("persiste o valor na conta, atualiza o cookie e o relê após login", async () => {
    const devices = [{ id: "device-owned" }];
    listDevicesMock.mockResolvedValue(devices);
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
      message: "Tarifa salva na sua conta.",
    });
    expect(captureCurrentDayMock).toHaveBeenCalledWith(
      "authenticated-user",
      devices,
      1,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain(
      "SameSite=lax",
    );
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    expect(resolveEffectiveEnergyTariff(cookieValue)).toBe(1);

    findLatestMock.mockResolvedValue({ tariffBrlPerKwh: 1 });
    getCookieMock.mockReturnValue(undefined);
    await expect(
      getEffectiveEnergyTariff("authenticated-user"),
    ).resolves.toBe(1);
  });

  it("não grava cookie quando a persistência da conta falha", async () => {
    captureCurrentDayMock.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    const response = await POST(createRequest("5,00"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      message: "Não foi possível salvar a tarifa agora.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("retorna 401 sem sessão e não grava a tarifa", async () => {
    const { AuthenticationRequiredError } = await import(
      "@/lib/supabase/require-user"
    );
    requireUserMock.mockRejectedValueOnce(
      new AuthenticationRequiredError(),
    );

    const response = await POST(createRequest("1,00"));
    const body = (await response.json()) as {
      success: boolean;
      message: string;
    };

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      message: "Autenticação necessária.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(captureCurrentDayMock).not.toHaveBeenCalled();
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
      expect(captureCurrentDayMock).not.toHaveBeenCalled();
    },
  );
});

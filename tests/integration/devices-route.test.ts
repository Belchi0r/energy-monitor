import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  GET,
  POST,
} from "@/app/api/devices/route";
import {
  DELETE,
  PATCH,
} from "@/app/api/devices/[id]/route";
import type { DeviceView } from "@/lib/devices/types";
import {
  DeviceNameConflictError,
  DeviceNotFoundError,
  type DeviceService,
} from "@/lib/services/device-service";
import type {
  DeviceApiErrorResponse,
  DeviceApiSuccessResponse,
  DeviceListApiSuccessResponse,
} from "@/lib/types/device-api";

const serviceMocks = vi.hoisted(() => ({
  listDevices: vi.fn<DeviceService["listDevices"]>(),
  createDevice: vi.fn<DeviceService["createDevice"]>(),
  updateDevice: vi.fn<DeviceService["updateDevice"]>(),
  deleteDevice: vi.fn<DeviceService["deleteDevice"]>(),
}));

vi.mock("@/lib/devices/application", () => ({
  deviceService: serviceMocks,
}));

const input = {
  name: "Televisor",
  category: "Eletrônicos",
  powerWatts: 180,
  averageDailyHours: 4,
  status: "active",
  usageProfileType: "CUSTOM",
  usageWindows: [
    { startHour: 8, endHour: 12, weight: 0.6 },
    { startHour: 14, endHour: 18, weight: 0.4 },
  ],
} as const;

const legacyInput = {
  name: "Televisor",
  category: "Eletrônicos",
  powerWatts: 180,
  averageDailyHours: 4,
  status: "active",
} as const;

const device: DeviceView = {
  id: "device-1",
  ...input,
  description: "Estimativa atual para eletrônicos.",
  estimatedDailyConsumptionKwh: 0.72,
  createdAt: "2026-07-29T12:00:00.000Z",
  updatedAt: "2026-07-29T12:00:00.000Z",
};

function jsonRequest(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
) {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function context(id = device.id) {
  return {
    params: Promise.resolve({ id }),
  };
}

beforeEach(() => {
  Object.values(serviceMocks).forEach((mock) => mock.mockReset());
  serviceMocks.listDevices.mockResolvedValue([device]);
  serviceMocks.createDevice.mockResolvedValue(device);
  serviceMocks.updateDevice.mockResolvedValue(device);
  serviceMocks.deleteDevice.mockResolvedValue();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("/api/devices", () => {
  it("lista dispositivos com HTTP 200 e sem cache", async () => {
    const response = await GET();
    const body =
      (await response.json()) as DeviceListApiSuccessResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toEqual([device]);
  });

  it("cria um dispositivo com HTTP 201", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/devices", "POST", input),
    );
    const body =
      (await response.json()) as DeviceApiSuccessResponse;

    expect(response.status).toBe(201);
    expect(serviceMocks.createDevice).toHaveBeenCalledWith(input);
    expect(body.data).toEqual(device);
  });

  it("mantém compatibilidade com payload sem perfil", async () => {
    const response = await POST(
      jsonRequest(
        "http://localhost/api/devices",
        "POST",
        legacyInput,
      ),
    );

    expect(response.status).toBe(201);
    expect(serviceMocks.createDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        usageProfileType: "SPLIT",
        usageWindows: [
          { startHour: 8, endHour: 12, weight: 0.5 },
          { startHour: 14, endHour: 18, weight: 0.5 },
        ],
      }),
    );
  });

  it("rejeita JSON malformado e campos inválidos com HTTP 400", async () => {
    const malformedResponse = await POST(
      new Request("http://localhost/api/devices", {
        method: "POST",
        body: "{",
      }),
    );
    const invalidResponse = await POST(
      jsonRequest("http://localhost/api/devices", "POST", {
        ...input,
        averageDailyHours: 30,
      }),
    );

    expect(malformedResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(400);
    expect(serviceMocks.createDevice).not.toHaveBeenCalled();
  });

  it("retorna HTTP 409 para nome duplicado", async () => {
    serviceMocks.createDevice.mockRejectedValueOnce(
      new DeviceNameConflictError(),
    );

    const response = await POST(
      jsonRequest("http://localhost/api/devices", "POST", input),
    );
    const body = (await response.json()) as DeviceApiErrorResponse;

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DEVICE_NAME_CONFLICT");
  });

  it("oculta detalhes internos em falhas inesperadas", async () => {
    serviceMocks.listDevices.mockRejectedValueOnce(
      new Error("segredo do banco"),
    );

    const response = await GET();
    const serializedBody = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(serializedBody).not.toContain("segredo do banco");
  });
});

describe("/api/devices/[id]", () => {
  it("atualiza um dispositivo com HTTP 200", async () => {
    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/devices/${device.id}`,
        "PATCH",
        input,
      ),
      context(),
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.updateDevice).toHaveBeenCalledWith(
      device.id,
      input,
    );
  });

  it("edita e encaminha o perfil personalizado", async () => {
    const editedInput = {
      ...input,
      usageWindows: [
        { startHour: 19, endHour: 23, weight: 1 },
      ],
    } as const;
    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/devices/${device.id}`,
        "PATCH",
        editedInput,
      ),
      context(),
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.updateDevice).toHaveBeenCalledWith(
      device.id,
      editedInput,
    );
  });

  it("mantém PATCH compatível com payload antigo", async () => {
    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/devices/${device.id}`,
        "PATCH",
        legacyInput,
      ),
      context(),
    );

    expect(response.status).toBe(200);
    expect(serviceMocks.updateDevice).toHaveBeenCalledWith(
      device.id,
      expect.objectContaining({
        usageProfileType: "SPLIT",
        usageWindows: [
          { startHour: 8, endHour: 12, weight: 0.5 },
          { startHour: 14, endHour: 18, weight: 0.5 },
        ],
      }),
    );
  });

  it("remove um dispositivo com HTTP 204", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/devices/${device.id}`, {
        method: "DELETE",
      }),
      context(),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(serviceMocks.deleteDevice).toHaveBeenCalledWith(device.id);
  });

  it.each(["PATCH", "DELETE"] as const)(
    "retorna HTTP 404 no %s para id inexistente",
    async (method) => {
      if (method === "PATCH") {
        serviceMocks.updateDevice.mockRejectedValueOnce(
          new DeviceNotFoundError(),
        );
      } else {
        serviceMocks.deleteDevice.mockRejectedValueOnce(
          new DeviceNotFoundError(),
        );
      }

      const response =
        method === "PATCH"
          ? await PATCH(
              jsonRequest(
                "http://localhost/api/devices/missing",
                "PATCH",
                input,
              ),
              context("missing"),
            )
          : await DELETE(
              new Request("http://localhost/api/devices/missing", {
                method: "DELETE",
              }),
              context("missing"),
            );
      const body = (await response.json()) as DeviceApiErrorResponse;

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("DEVICE_NOT_FOUND");
    },
  );
});

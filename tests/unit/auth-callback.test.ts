import { NextRequest } from "next/server";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { createClientMock, exchangeCodeForSessionMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { GET } from "@/app/auth/callback/route";

function request(query: string) {
  return new NextRequest(`http://localhost/auth/callback${query}`);
}

beforeEach(() => {
  createClientMock.mockReset();
  exchangeCodeForSessionMock.mockReset();
  createClientMock.mockResolvedValue({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  });
  exchangeCodeForSessionMock.mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("troca um code válido pela sessão e redireciona internamente", async () => {
    const response = await GET(
      request("?code=code-secreto&next=%2Fdevices"),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("code-secreto");
    expect(response.headers.get("location")).toBe(
      "http://localhost/devices",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejeita callback sem code sem chamar o Supabase", async () => {
    const response = await GET(request("?next=%2Fdevices"));
    const location = response.headers.get("location")!;

    expect(createClientMock).not.toHaveBeenCalled();
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(location).toBe(
      "http://localhost/login?message=confirmation-error",
    );
  });

  it("não expõe code nem erro interno quando a troca falha", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      error: new Error("detalhe interno sensível do Supabase"),
    });

    const response = await GET(request("?code=code-super-secreto"));
    const publicResponse = [
      response.headers.get("location"),
      ...Array.from(response.headers.values()),
    ].join(" ");

    expect(publicResponse).not.toContain("code-super-secreto");
    expect(publicResponse).not.toContain("detalhe interno sensível");
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=confirmation-error",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejeita next externo após trocar o code com sucesso", async () => {
    const response = await GET(
      request("?code=code-secreto&next=https%3A%2F%2Fevil.test"),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("code-secreto");
    expect(response.headers.get("location")).toBe("http://localhost/");
  });
});

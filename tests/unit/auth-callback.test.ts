import { NextRequest } from "next/server";
import {
  afterEach,
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
import { RECOVERY_SESSION_COOKIE } from "@/lib/auth/recovery-session";

function request(query: string, origin = "http://localhost") {
  return new NextRequest(`${origin}/auth/callback${query}`);
}

beforeEach(() => {
  vi.stubEnv(
    "AUTH_RECOVERY_PROOF_SECRET",
    "test-only-callback-recovery-secret-with-at-least-32-bytes",
  );
  createClientMock.mockReset();
  exchangeCodeForSessionMock.mockReset();
  createClientMock.mockResolvedValue({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  });
  exchangeCodeForSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: "signup-access-token",
        user: { id: "signup-user" },
      },
      user: { id: "signup-user" },
    },
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /auth/callback", () => {
  it("troca um code válido pela sessão e redireciona internamente", async () => {
    const response = await GET(
      request("?code=code-secreto&next=%2Fdevices"),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("code-secreto");
    expect(response.headers.get("location")).toBe(
      "http://localhost/",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("permite /reset-password e marca uma sessão PKCE de recuperação", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      data: {
        redirectType: "recovery",
        session: {
          access_token: "recovery-access-token",
          user: { id: "recovery-user" },
        },
        user: { id: "recovery-user" },
      },
      error: null,
    });

    const response = await GET(
      request("?code=code-secreto&next=%2Freset-password"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/reset-password",
    );
    expect(response.cookies.get(RECOVERY_SESSION_COOKIE)?.value).toBeTruthy();
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain(
      "Path=/reset-password",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=1800");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("marca o comprovante como Secure em HTTPS", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      data: {
        redirectType: "recovery",
        session: {
          access_token: "recovery-access-token",
          user: { id: "recovery-user" },
        },
        user: { id: "recovery-user" },
      },
      error: null,
    });

    const response = await GET(
      request(
        "?code=code-secreto&next=%2Freset-password",
        "https://energy.example",
      ),
    );

    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("location")).toBe(
      "https://energy.example/reset-password",
    );
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

  it("usa erro controlado de recuperação quando falta o code", async () => {
    const response = await GET(
      request("?next=%2Freset-password"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=recovery-error",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
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
    const location = response.headers.get("location")!;

    expect(location).toBe("http://localhost/");
    expect(location).not.toContain("evil.test");
  });

  it("não conclui cadastro com identidade divergente", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "signup-access-token",
          user: { id: "session-user" },
        },
        user: { id: "different-user" },
      },
      error: null,
    });

    const response = await GET(request("?code=code-secreto"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=confirmation-error",
    );
  });

  it("não cria recuperação sem identidade correspondente", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      data: {
        redirectType: "recovery",
        session: {
          access_token: "recovery-access-token",
          user: { id: "session-user" },
        },
        user: { id: "different-user" },
      },
      error: null,
    });

    const response = await GET(
      request("?code=code-secreto&next=%2Freset-password"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=recovery-error",
    );
    expect(response.cookies.get(RECOVERY_SESSION_COOKIE)).toBeUndefined();
  });
});

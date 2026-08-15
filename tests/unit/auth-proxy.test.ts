import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest } from "next/server";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { createServerClientMock, getClaimsMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { updateSession } from "@/lib/supabase/proxy";

const supabaseCacheHeaders = {
  "Cache-Control":
    "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

let cookieMethods: CookieMethodsServer | undefined;

function request(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  cookieMethods = undefined;
  createServerClientMock.mockReset();
  getClaimsMock.mockReset();
  createServerClientMock.mockImplementation(
    (
      _url: string,
      _key: string,
      options: { cookies: CookieMethodsServer },
    ) => {
      cookieMethods = options.cookies;

      return {
        auth: {
          getClaims: getClaimsMock,
        },
      };
    },
  );
  getClaimsMock.mockResolvedValue({ data: null, error: null });
});

function mockCookieRefresh(authenticated = false) {
  getClaimsMock.mockImplementationOnce(async () => {
    await cookieMethods?.setAll?.(
      [
        {
          name: "sb-test-auth-token",
          value: "refreshed-cookie",
          options: { httpOnly: true, path: "/" },
        },
      ],
      supabaseCacheHeaders,
    );

    return authenticated
      ? {
          data: { claims: { sub: "authenticated-user" } },
          error: null,
        }
      : { data: null, error: null };
  });
}

describe("proxy de autenticação", () => {
  it("aplica headers de cache e cookies do setAll na resposta normal", async () => {
    const nextRequest = request("/signup");
    mockCookieRefresh();

    const response = await updateSession(nextRequest);

    expect(response.headers.get("cache-control")).toBe(
      supabaseCacheHeaders["Cache-Control"],
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(nextRequest.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-cookie",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-cookie",
    );
  });

  it("preserva headers de cache e cookies no redirect sem copiar headers internos", async () => {
    mockCookieRefresh();

    const response = await updateSession(request("/devices"));

    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe(
      supabaseCacheHeaders["Cache-Control"],
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-cookie",
    );
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it("redireciona usuário deslogado em rota protegida para /login", async () => {
    const response = await updateSession(request("/devices"));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/devices");
  });

  it("preserva somente caminho e query internos no parâmetro next", async () => {
    const response = await updateSession(
      request("/history?period=30d&compare=true"),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.origin).toBe("http://localhost");
    expect(location.searchParams.get("next")).toBe(
      "/history?period=30d&compare=true",
    );
    expect(location.searchParams.get("next")).not.toMatch(
      /^https?:|^\/\//,
    );
  });

  it.each(["/login", "/signup", "/forgot-password"])(
    "não mantém usuário autenticado na rota pública %s",
    async (path) => {
    getClaimsMock.mockResolvedValueOnce({
      data: { claims: { sub: "authenticated-user" } },
      error: null,
    });

      const response = await updateSession(request(path));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/");
    },
  );

  it("permite páginas públicas e endpoints de autenticação sem sessão", async () => {
    for (const path of [
      "/login",
      "/signup",
      "/forgot-password",
      "/auth/callback",
      "/auth/confirm",
    ]) {
      const response = await updateSession(request(path));

      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("libera somente /demo antes de criar cliente ou consultar sessão", async () => {
    const response = await updateSession(request("/demo?period=7d"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(getClaimsMock).not.toHaveBeenCalled();
  });

  it("não amplia o bypass público para subcaminhos de /demo", async () => {
    await updateSession(request("/demo/privado"));

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(getClaimsMock).toHaveBeenCalledTimes(1);
  });

  it("protege /reset-password sem sessão e permite com sessão válida", async () => {
    const anonymousResponse = await updateSession(request("/reset-password"));
    const anonymousLocation = new URL(
      anonymousResponse.headers.get("location")!,
    );

    expect(anonymousLocation.pathname).toBe("/login");
    expect(anonymousLocation.searchParams.get("next")).toBe(
      "/reset-password",
    );

    getClaimsMock.mockResolvedValueOnce({
      data: { claims: { sub: "recovery-user" } },
      error: null,
    });

    const authenticatedResponse = await updateSession(
      request("/reset-password"),
    );

    expect(authenticatedResponse.headers.get("location")).toBeNull();
  });

  it("não transforma APIs sem sessão em redirecionamentos HTML", async () => {
    mockCookieRefresh();
    const response = await updateSession(request("/api/devices"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe(
      supabaseCacheHeaders["Cache-Control"],
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-cookie",
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveAppOrigin } from "@/lib/auth/origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveAppOrigin", () => {
  it("prioriza configuredSiteUrl sobre headers conflitantes", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = new Headers({
      origin: "https://header-controlado.example",
      "x-forwarded-host": "header-controlado.example",
      "x-forwarded-proto": "https",
    });

    expect(
      resolveAppOrigin(headers, "https://energy.example/app"),
    ).toBe("https://energy.example");
  });

  it.each([
    undefined,
    "javascript:alert(1)",
    "http://externo.example",
    "http://localhost:3000",
  ])(
    "retorna null em produção sem configuredSiteUrl válida: %s",
    (configuredSiteUrl) => {
      vi.stubEnv("NODE_ENV", "production");
      const headers = new Headers({
        host: "header-controlado.example",
        origin: "https://header-controlado.example",
      });

      expect(resolveAppOrigin(headers, configuredSiteUrl)).toBeNull();
    },
  );

  it.each([
    ["localhost:3000", "http://localhost:3000"],
    ["127.0.0.1:3000", "http://127.0.0.1:3000"],
    ["[::1]:3000", "http://[::1]:3000"],
  ])("aceita HTTP local em desenvolvimento para %s", (host, origin) => {
    vi.stubEnv("NODE_ENV", "development");
    const headers = new Headers({ host, origin });

    expect(resolveAppOrigin(headers)).toBe(origin);
  });

  it("rejeita HTTP externo em desenvolvimento", () => {
    vi.stubEnv("NODE_ENV", "development");
    const headers = new Headers({
      host: "externo.example",
      origin: "http://externo.example",
    });

    expect(resolveAppOrigin(headers)).toBeNull();
  });

  it("rejeita URL com usuário e senha", () => {
    vi.stubEnv("NODE_ENV", "development");
    const headers = new Headers({
      host: "externo.example",
      origin: "https://usuario:senha@externo.example",
    });

    expect(resolveAppOrigin(headers)).toBeNull();
  });

  it("rejeita protocolo inválido em desenvolvimento", () => {
    vi.stubEnv("NODE_ENV", "development");
    const headers = new Headers({
      host: "localhost:3000",
      origin: "ftp://localhost:3000",
    });

    expect(resolveAppOrigin(headers)).toBeNull();
  });
});

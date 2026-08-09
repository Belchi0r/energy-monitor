import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildPublicDemoUrl,
  getPublicDemoCanonicalRedirect,
  isPublicDemoPagePath,
  parsePublicDemoSearchParams,
} from "@/components/utils/public-demo-route";
import { getPublicDemoDashboard } from "@/lib/dashboard/public-demo";
import { MockDashboardRepository } from "@/lib/repositories/mock-dashboard-repository";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("demonstração pública", () => {
  it("aceita somente o pathname público exato", () => {
    expect(isPublicDemoPagePath("/demo")).toBe(true);
    expect(isPublicDemoPagePath("/demo/")).toBe(false);
    expect(isPublicDemoPagePath("/demo/private")).toBe(false);
    expect(isPublicDemoPagePath("/")).toBe(false);
  });

  it("canonicaliza período e comparação sem introduzir modo autenticado", () => {
    const valid = parsePublicDemoSearchParams({
      period: "30d",
      compare: "true",
    });
    const invalid = parsePublicDemoSearchParams({
      period: "year",
      compare: "false",
    });

    expect(valid).toEqual({
      period: "30d",
      compare: true,
      shouldRedirect: false,
    });
    expect(buildPublicDemoUrl(valid.period, valid.compare)).toBe(
      "/demo?period=30d&compare=true",
    );
    expect(getPublicDemoCanonicalRedirect(invalid)).toBe(
      "/demo?period=today",
    );
  });

  it("obtém somente dados globais simulados pelo MockDashboardRepository", async () => {
    const getDataset = vi.spyOn(
      MockDashboardRepository.prototype,
      "getDataset",
    );

    const view = await getPublicDemoDashboard({
      period: "7d",
      compare: true,
    });

    expect(view.mode).toBe("demo");
    expect(view.dataOrigin).toBe("global-demo");
    expect(view.period).toBe("7d");
    expect(view.compare).toBe(true);
    expect(getDataset).toHaveBeenCalledWith("last7Days");
    expect(getDataset).toHaveBeenCalledWith("previous7Days");
  });

  it("mantém a rota fora de Prisma, Supabase, APIs privadas e mutations", () => {
    const page = source("app/demo/page.tsx");
    const publicData = source("lib/dashboard/public-demo.ts");
    const overview = source("components/dashboard/DashboardOverview.tsx");

    expect(publicData).toContain("MockDashboardRepository");
    expect(publicData).not.toMatch(/prisma|supabase|dashboard\/application/i);
    expect(page).not.toMatch(/requireUser|createClient|supabase|prisma/i);
    expect(page).not.toMatch(/\/api\//);
    expect(page).not.toMatch(/action=|<form/i);
    expect(overview).not.toMatch(/action=|<form|\/api\//i);
  });

  it("identifica dados simulados e oferece login na experiência pública", () => {
    const page = source("app/demo/page.tsx");
    const login = source("components/auth/LoginForm.tsx");

    expect(page).toContain("Dados simulados");
    expect(page).toContain("Entrar na minha conta");
    expect(page).toContain('href="/login"');
    expect(login).toContain("Explorar demonstração");
    expect(login).toContain('href="/demo"');
  });
});

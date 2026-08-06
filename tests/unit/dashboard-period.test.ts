import { describe, expect, it } from "vitest";

import {
  buildDashboardUrl,
  getDashboardCanonicalRedirect,
  parseDashboardSearchParams,
} from "@/components/utils/dashboard-period";

describe("estado da URL do dashboard", () => {
  it("usa home quando mode está ausente", () => {
    expect(parseDashboardSearchParams({}).mode).toBe("home");
  });

  it("normaliza mode inválido para home", () => {
    expect(parseDashboardSearchParams({ mode: "externo" })).toEqual(
      expect.objectContaining({ mode: "home", shouldRedirect: true }),
    );
  });

  it("canonicaliza home com compare=true para compare=false", () => {
    expect(
      parseDashboardSearchParams({
        mode: "home",
        period: "30d",
        compare: "true",
      }),
    ).toEqual({
      mode: "home",
      period: "30d",
      compare: false,
      shouldRedirect: true,
    });
  });

  it("gera redirect canônico sem compare e preserva período e home", () => {
    const routeState = parseDashboardSearchParams({
      mode: "home",
      period: "7d",
      compare: "true",
    });

    expect(getDashboardCanonicalRedirect(routeState)).toBe(
      "/?mode=home&period=7d",
    );
    expect(buildDashboardUrl("7d", true, "home")).toBe(
      "/?mode=home&period=7d",
    );
  });

  it("mantém compare=true válido em demo", () => {
    const routeState = parseDashboardSearchParams({
      mode: "demo",
      period: "30d",
      compare: "true",
    });

    expect(routeState).toEqual({
      mode: "demo",
      period: "30d",
      compare: true,
      shouldRedirect: false,
    });
    expect(getDashboardCanonicalRedirect(routeState)).toBeNull();
  });

  it("preserva demo ao alterar período e comparação", () => {
    expect(buildDashboardUrl("30d", true, "demo")).toBe(
      "/?mode=demo&period=30d&compare=true",
    );
    expect(buildDashboardUrl("7d", false, "demo")).toBe(
      "/?mode=demo&period=7d",
    );
  });
});

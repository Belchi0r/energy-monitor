import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  buildHistoryUrl,
  getHistoryCanonicalRedirect,
  parseHistorySearchParams,
} from "@/components/utils/history-route";
import { parseDashboardDataMode } from "@/components/utils/dashboard-mode";

describe("modo compartilhado nas páginas", () => {
  it("faz /history sem mode resultar em home", () => {
    expect(parseHistorySearchParams({})).toEqual({
      mode: "home",
      period: "30d",
      compare: false,
      shouldRedirect: false,
    });
  });

  it("preserva a experiência demonstrativa do histórico", () => {
    const state = parseHistorySearchParams({
      mode: "demo",
      period: "7d",
      compare: "1",
    });

    expect(state).toEqual({
      mode: "demo",
      period: "7d",
      compare: true,
      shouldRedirect: false,
    });
    expect(buildHistoryUrl(state.period, state.compare, state.mode)).toBe(
      "/history?mode=demo&period=7d&compare=1",
    );
  });

  it("preserva comparação residencial e canonicaliza Hoje para 30 dias", () => {
    const state = parseHistorySearchParams({
      mode: "home",
      period: "today",
      compare: "1",
    });

    expect(state).toEqual({
      mode: "home",
      period: "30d",
      compare: true,
      shouldRedirect: true,
    });
    expect(getHistoryCanonicalRedirect(state)).toBe(
      "/history?mode=home&period=30d&compare=1",
    );
  });

  it("canonicaliza mode inválido no histórico", () => {
    const state = parseHistorySearchParams({
      mode: "externo",
      period: "7d",
    });

    expect(state.mode).toBe("home");
    expect(getHistoryCanonicalRedirect(state)).toBe(
      "/history?mode=home&period=7d",
    );
  });

  it("faz /alerts sem mode resultar em home", () => {
    expect(parseDashboardDataMode({})).toEqual({
      mode: "home",
      shouldRedirect: false,
    });
  });

  it("mantém Alertas residencial e demonstrativo explícitos na página", async () => {
    const source = await readFile(
      new URL("../../app/alerts/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('period: isDemo ? "30d" : "today"');
    expect(source).toContain("mode: modeState.mode");
    expect(source).toContain("Cadastre dispositivos para gerar alertas");
    expect(source).toContain("dataOrigin={view.dataOrigin}");
  });
});

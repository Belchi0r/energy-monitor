import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  getCurrentNavigationItem,
  isNavigationItemActive,
  navigationItems,
} from "@/components/layout/navigation";
import {
  getDataModeIndicatorCopy,
  resolveDataModeIndicatorContext,
} from "@/components/layout/DataModeIndicator";
import {
  buildDataModeUrl,
  buildModeAwareNavigationHref,
  parseDashboardDataMode,
} from "@/components/utils/dashboard-mode";

describe("navegação principal", () => {
  it.each(navigationItems)(
    "identifica $label como rota ativa",
    ({ href, label }) => {
      expect(isNavigationItemActive(href, href)).toBe(true);
      expect(getCurrentNavigationItem(href).label).toBe(label);
    },
  );

  it("não marca a visão geral em rotas internas", () => {
    expect(isNavigationItemActive("/devices", "/")).toBe(false);
  });

  it("mantém a seção ativa em uma futura rota filha", () => {
    expect(isNavigationItemActive("/devices/kitchen", "/devices")).toBe(
      true,
    );
  });

  it("usa a visão geral como fallback para rotas desconhecidas", () => {
    expect(getCurrentNavigationItem("/unknown").href).toBe("/");
  });

  it("usa home por padrão e canonicaliza modos inválidos", () => {
    expect(parseDashboardDataMode({})).toEqual({
      mode: "home",
      shouldRedirect: false,
    });
    expect(parseDashboardDataMode({ mode: "externo" })).toEqual({
      mode: "home",
      shouldRedirect: true,
    });
  });

  it("preserva o modo nos links da navegação", () => {
    expect(buildModeAwareNavigationHref("/", "demo")).toBe(
      "/?mode=demo&period=today",
    );
    expect(buildModeAwareNavigationHref("/history", "demo")).toBe(
      "/history?mode=demo",
    );
    expect(buildModeAwareNavigationHref("/alerts", "home")).toBe(
      "/alerts?mode=home",
    );
    expect(buildModeAwareNavigationHref("/settings", "demo")).toBe(
      "/settings?mode=demo",
    );
    expect(buildModeAwareNavigationHref("/devices", "demo")).toBe(
      "/devices?mode=demo",
    );
  });

  it("impede values de sobrescrever o modo validado", () => {
    expect(
      buildDataModeUrl("/", "home", {
        mode: "demo",
        period: "today",
      }),
    ).toBe("/?mode=home&period=today");
  });

  it("varia o indicador contextual entre home, demo, dispositivos e configurações", () => {
    expect(getDataModeIndicatorCopy("home")).toEqual({
      title: "Minha residência",
      description:
        "Estimativas baseadas somente nos dispositivos vinculados à sua conta.",
    });
    expect(getDataModeIndicatorCopy("demo")).toEqual({
      title: "Modo demonstração",
      description:
        "Cenários simulados, sem monitoramento em tempo real.",
    });
    expect(getDataModeIndicatorCopy("demo", "devices")).toEqual({
      title: "Dispositivos da conta",
      description:
        "Cadastro persistente vinculado à sua conta e separado dos cenários demonstrativos.",
    });
    expect(getDataModeIndicatorCopy("demo", "settings").title).toBe(
      "Preferências locais",
    );
    expect(resolveDataModeIndicatorContext("/devices")).toBe("devices");
    expect(resolveDataModeIndicatorContext("/settings")).toBe("settings");
    expect(resolveDataModeIndicatorContext("/history")).toBe("mode");
  });

  it("faz Sidebar e MobileNavigation usarem o mesmo contexto", async () => {
    const [sidebarSource, mobileSource] = await Promise.all([
      readFile(
        new URL("../../components/layout/Sidebar.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../components/layout/MobileNavigation.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);
    const sharedResolution =
      "resolveDataModeIndicatorContext(pathname)";

    expect(sidebarSource).toContain(sharedResolution);
    expect(mobileSource).toContain(sharedResolution);
  });
});

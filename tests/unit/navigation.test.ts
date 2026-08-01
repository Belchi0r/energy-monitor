import { describe, expect, it } from "vitest";

import {
  getCurrentNavigationItem,
  isNavigationItemActive,
  navigationItems,
} from "@/components/layout/navigation";

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
});

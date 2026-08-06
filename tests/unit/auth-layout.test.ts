import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => "DASHBOARD_HEADER",
}));

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => "DASHBOARD_SIDEBAR",
}));

import { AppShell } from "@/components/layout/AppShell";
import {
  isAuthPagePath,
  isPublicAuthPagePath,
} from "@/lib/auth/routes";

function renderAppShell(pathname: string) {
  pathnameMock.mockReturnValue(pathname);

  return renderToStaticMarkup(
    createElement(
      AppShell,
      null,
      createElement("div", null, "PAGE_CONTENT"),
    ),
  );
}

beforeEach(() => {
  pathnameMock.mockReset();
});

describe("layout das rotas de autenticação", () => {
  it("mantém uma fonte única que inclui /reset-password no contexto auth", () => {
    expect(isAuthPagePath("/login")).toBe(true);
    expect(isAuthPagePath("/signup")).toBe(true);
    expect(isAuthPagePath("/forgot-password")).toBe(true);
    expect(isAuthPagePath("/reset-password")).toBe(true);
    expect(isPublicAuthPagePath("/reset-password")).toBe(false);
  });

  it("não renderiza sidebar nem cabeçalho em /reset-password", () => {
    const markup = renderAppShell("/reset-password");

    expect(markup).toContain("PAGE_CONTENT");
    expect(markup).not.toContain("DASHBOARD_HEADER");
    expect(markup).not.toContain("DASHBOARD_SIDEBAR");
  });

  it("preserva o AppShell nas páginas da dashboard", () => {
    const markup = renderAppShell("/");

    expect(markup).toContain("DASHBOARD_HEADER");
    expect(markup).toContain("DASHBOARD_SIDEBAR");
    expect(markup).toContain("PAGE_CONTENT");
  });
});

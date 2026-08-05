import { describe, expect, it } from "vitest";

import { resolveSafeRedirectPath } from "@/lib/auth/redirect";

describe("resolveSafeRedirectPath", () => {
  it.each([
    ["/devices", "/devices"],
    ["/history?period=30d", "/history?period=30d"],
    ["/alerts#recentes", "/alerts#recentes"],
  ])("aceita o destino interno %s", (value, expected) => {
    expect(resolveSafeRedirectPath(value)).toBe(expected);
  });

  it.each([
    "https://site-malicioso.com",
    "http://site-malicioso.com/devices",
    "mailto:attacker@example.com",
  ])("rejeita URL externa %s", (value) => {
    expect(resolveSafeRedirectPath(value)).toBe("/");
  });

  it.each([
    "//site-malicioso.com",
    "/\\site-malicioso.com",
    "/%5csite-malicioso.com",
    "/%252f%252fsite-malicioso.com",
    "/%2e%2e//site-malicioso.com",
  ])("rejeita formato ambíguo %s", (value) => {
    expect(resolveSafeRedirectPath(value)).toBe("/");
  });

  it("usa apenas um fallback interno válido", () => {
    expect(
      resolveSafeRedirectPath("https://site-malicioso.com", "/login"),
    ).toBe("/login");
    expect(
      resolveSafeRedirectPath("https://site-malicioso.com", "//evil.test"),
    ).toBe("/");
  });
});

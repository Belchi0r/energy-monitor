import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SignupForm } from "@/components/auth/SignupForm";
import { isPublicSignupEnabled } from "@/lib/auth/public-signup-config";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuração server-only do cadastro público", () => {
  it.each([
    [undefined, false],
    ["false", false],
    ["true", true],
    ["TRUE", false],
    ["1", false],
    [" true ", false],
  ])("interpreta %s como %s", (value, expected) => {
    vi.stubEnv("AUTH_PUBLIC_SIGNUP_ENABLED", value);

    expect(isPublicSignupEnabled()).toBe(expected);
  });

  it("não coloca a configuração server-only no componente cliente", () => {
    const config = source("lib/auth/public-signup-config.ts");
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(config).toContain('import "server-only"');
    expect(config).toContain("process.env.AUTH_PUBLIC_SIGNUP_ENABLED");
    expect(config).not.toContain("NEXT_PUBLIC");
    expect(signupForm).not.toContain("AUTH_PUBLIC_SIGNUP_ENABLED");
    expect(signupForm).not.toContain("process.env");
    expect(signupForm).not.toContain("public-signup-config");
  });

  it("é resolvida na página server-side e passa somente booleanos ao cliente", () => {
    const signupPage = source("app/signup/page.tsx");

    expect(signupPage).toContain("isPublicSignupEnabled()");
    expect(signupPage).toContain(
      "publicSignupEnabled={publicSignupEnabled}",
    );
    expect(signupPage).not.toContain("AUTH_PUBLIC_SIGNUP_ENABLED");
  });

  it("sem cadastro público renderiza somente as ações demo e login", () => {
    const markup = renderToStaticMarkup(
      createElement(SignupForm, {
        publicSignupEnabled: false,
      }),
    );

    expect(markup).toContain('href="/demo"');
    expect(markup).toContain("Explorar demonstração");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Entrar");
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain('name="email"');
    expect(markup).not.toContain('name="password"');
    expect(markup).not.toContain("OtpCodeField");
  });

  it("mantém a experiência completa selecionável quando a flag está ativa", () => {
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(signupForm).toContain("publicSignupEnabled ?");
    expect(signupForm).toContain("<EnabledSignupForm");
    expect(signupForm).toContain("<SignupActionFlow");
    expect(signupForm).toContain("signupAction");
    expect(signupForm).toContain("SignupEmailLinkStep");
    expect(signupForm).not.toContain("SignupOtpStep");
  });
});

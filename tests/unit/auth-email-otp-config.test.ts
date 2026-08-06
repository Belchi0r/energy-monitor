import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isEmailOtpEnabled } from "@/lib/auth/email-otp-config";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuração server-only do OTP por e-mail", () => {
  it.each([
    [undefined, false],
    ["false", false],
    ["true", true],
    ["TRUE", false],
    ["1", false],
    [" true ", false],
  ])("interpreta %s como %s", (value, expected) => {
    if (value === undefined) {
      vi.stubEnv("AUTH_EMAIL_OTP_ENABLED", undefined);
    } else {
      vi.stubEnv("AUTH_EMAIL_OTP_ENABLED", value);
    }

    expect(isEmailOtpEnabled()).toBe(expected);
  });

  it("permanece fora do grafo dos componentes clientes", () => {
    const config = source("lib/auth/email-otp-config.ts");

    expect(config).toContain('import "server-only"');
    expect(config).toContain("process.env.AUTH_EMAIL_OTP_ENABLED");
    expect(config).not.toContain("NEXT_PUBLIC");

    for (const file of [
      "components/auth/SignupForm.tsx",
      "components/auth/ForgotPasswordForm.tsx",
    ]) {
      const clientComponent = source(file);

      expect(clientComponent).not.toContain("email-otp-config");
      expect(clientComponent).not.toContain("AUTH_EMAIL_OTP_ENABLED");
      expect(clientComponent).not.toContain("process.env");
    }
  });

  it("é lida nas páginas server e envia somente o booleano", () => {
    const signupPage = source("app/signup/page.tsx");
    const recoveryPage = source("app/forgot-password/page.tsx");

    for (const page of [signupPage, recoveryPage]) {
      expect(page).toContain(
        'import { isEmailOtpEnabled } from "@/lib/auth/email-otp-config"',
      );
      expect(page).toContain("const emailOtpEnabled = isEmailOtpEnabled()");
      expect(page).toContain("emailOtpEnabled={emailOtpEnabled}");
      expect(page).not.toContain("AUTH_EMAIL_OTP_ENABLED");
    }
  });
});

describe("interfaces nos dois modos de confirmação", () => {
  it("cadastro por link não renderiza o campo OTP e mantém ações seguras", () => {
    const signup = source("components/auth/SignupForm.tsx");
    const linkStep = signup.slice(
      signup.indexOf("function SignupEmailLinkStep"),
      signup.indexOf("function SignupOtpStep"),
    );

    expect(linkStep).toContain("Confira seu e-mail");
    expect(linkStep).toContain(
      "Enviamos as próximas instruções quando aplicável.",
    );
    expect(linkStep).toContain("Reenviar confirmação");
    expect(linkStep).toContain("Trocar e-mail");
    expect(linkStep).toContain("Entrar");
    expect(linkStep).toContain("Esqueci minha senha");
    expect(linkStep).toContain("resendSignupConfirmationAction");
    expect(linkStep).not.toContain("OtpCodeField");
    expect(linkStep).not.toMatch(/código enviado|verificar código/i);
  });

  it("cadastro com OTP mantém integralmente a etapa de código", () => {
    const signup = source("components/auth/SignupForm.tsx");
    const otpStep = signup.slice(
      signup.indexOf("function SignupOtpStep"),
      signup.indexOf("type SignupActionFlowProps"),
    );

    expect(otpStep).toContain("<OtpCodeField");
    expect(otpStep).toContain("verifySignupOtpAction");
    expect(otpStep).toContain("Reenviar código");
    expect(otpStep).toContain("resendSignupConfirmationAction");
    expect(signup).toContain("return emailOtpEnabled ?");
  });

  it("recuperação por link não renderiza OTP e mantém resposta indistinguível", () => {
    const recovery = source("components/auth/ForgotPasswordForm.tsx");
    const linkStep = recovery.slice(
      recovery.indexOf("function RecoveryEmailLinkStep"),
      recovery.indexOf("function RecoveryOtpStep"),
    );

    expect(linkStep).toContain("Confira seu e-mail");
    expect(linkStep).toContain(
      "Caso exista uma conta associada a este endereço",
    );
    expect(linkStep).toContain("Reenviar e-mail");
    expect(linkStep).toContain("Trocar e-mail");
    expect(linkStep).toContain("Voltar para entrar");
    expect(linkStep).toContain("Criar conta");
    expect(linkStep).toContain("resendRecoveryCodeAction");
    expect(linkStep).not.toContain("OtpCodeField");
    expect(linkStep).not.toMatch(/código enviado|verificar código/i);
  });

  it("recuperação com OTP mantém a verificação e a prova assinada", () => {
    const recovery = source("components/auth/ForgotPasswordForm.tsx");
    const otpStep = recovery.slice(
      recovery.indexOf("function RecoveryOtpStep"),
      recovery.indexOf("type RecoveryActionFlowProps"),
    );
    const actions = source("app/auth/actions.ts");
    const resetPage = source("app/reset-password/page.tsx");

    expect(otpStep).toContain("<OtpCodeField");
    expect(otpStep).toContain("verifyRecoveryOtpAction");
    expect(otpStep).toContain("Reenviar código");
    expect(otpStep).toContain("resendRecoveryCodeAction");
    expect(recovery).toContain("return emailOtpEnabled ?");
    expect(actions).toContain("createRecoverySessionProof(data.session)");
    expect(resetPage).toContain("getRecoveryAuthContext()");
  });

  it("preserva o callback PKCE seguro como fluxo principal por link", () => {
    const callback = source("app/auth/callback/route.ts");

    expect(callback).toContain("resolveSafeRedirectPath");
    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).toContain('response.headers.set("Cache-Control", "no-store")');
    expect(callback).toContain('response.headers.set("Referrer-Policy", "no-referrer")');
  });
});

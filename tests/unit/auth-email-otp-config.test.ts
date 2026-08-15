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

  it("permanece server-only e controla somente a recuperação", () => {
    const signupPage = source("app/signup/page.tsx");
    const recoveryPage = source("app/forgot-password/page.tsx");

    expect(signupPage).not.toContain("isEmailOtpEnabled");
    expect(signupPage).not.toContain("emailOtpEnabled");
    expect(recoveryPage).toContain(
      'import { isEmailOtpEnabled } from "@/lib/auth/email-otp-config"',
    );
    expect(recoveryPage).toContain(
      "const emailOtpEnabled = isEmailOtpEnabled()",
    );
    expect(recoveryPage).toContain(
      "emailOtpEnabled={emailOtpEnabled}",
    );
    expect(recoveryPage).not.toContain("AUTH_EMAIL_OTP_ENABLED");
  });
});

describe("interfaces nos dois modos de confirmação", () => {
  it("cadastro por link não renderiza o campo OTP e mantém ações seguras", () => {
    const signup = source("components/auth/SignupForm.tsx");
    const linkStep = signup.slice(
      signup.indexOf("function SignupEmailLinkStep"),
      signup.indexOf("type SignupActionFlowProps"),
    );

    expect(linkStep).toContain("Confira seu e-mail");
    expect(linkStep).toContain(
      "Enviamos um link para confirmar sua conta.",
    );
    expect(linkStep).toContain("Reenviar confirmação");
    expect(linkStep).toContain("Trocar e-mail");
    expect(linkStep).toContain("Entrar");
    expect(linkStep).toContain("resendSignupConfirmationAction");
    expect(linkStep).not.toContain("OtpCodeField");
    expect(linkStep).not.toMatch(/código enviado|verificar código/i);
  });

  it("não permite que a flag OTP selecione uma etapa numérica no cadastro", () => {
    const signup = source("components/auth/SignupForm.tsx");
    const signupPage = source("app/signup/page.tsx");

    expect(signup).not.toContain("SignupOtpStep");
    expect(signup).not.toContain("OtpCodeField");
    expect(signup).not.toContain("verifySignupOtpAction");
    expect(signup).not.toContain("emailOtpEnabled");
    expect(signupPage).not.toContain("emailOtpEnabled");
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

  it("separa o callback PKCE da confirmação TokenHash SSR", () => {
    const callback = source("app/auth/callback/route.ts");
    const confirmation = source("app/auth/confirm/route.ts");

    expect(callback).toContain("resolveSafeRedirectPath");
    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).not.toContain("token_hash");
    expect(callback).not.toContain("verifyOtp");
    expect(confirmation).toContain("token_hash: tokenHash");
    expect(confirmation).toContain("type: EMAIL_CONFIRMATION_TYPE");
    expect(confirmation).toContain("supabase.auth.getUser()");
    expect(confirmation).toContain(
      'response.headers.set("Cache-Control", "no-store")',
    );
    expect(confirmation).toContain(
      'response.headers.set("Referrer-Policy", "no-referrer")',
    );
    expect(callback).toContain('response.headers.set("Cache-Control", "no-store")');
    expect(callback).toContain('response.headers.set("Referrer-Policy", "no-referrer")');
  });
});

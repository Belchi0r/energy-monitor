import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CapsLockNotice,
  readCapsLockState,
} from "@/components/auth/PasswordField";
import { PasswordMatchStatus } from "@/components/auth/PasswordMatchStatus";
import { signupFormSchema } from "@/lib/auth/validation";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function renderPasswordMatch(
  properties: Parameters<typeof PasswordMatchStatus>[0],
) {
  return renderToStaticMarkup(
    createElement(PasswordMatchStatus, properties),
  );
}

describe("experiência de senha no cadastro", () => {
  it("mantém a regra real de no mínimo 8 caracteres", () => {
    expect(
      signupFormSchema.safeParse({
        email: "person@example.com",
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(true);
    expect(
      signupFormSchema.safeParse({
        email: "person@example.com",
        password: "1234567",
        confirmPassword: "1234567",
      }).success,
    ).toBe(false);
  });

  it("liga o campo controlado ao indicador de força em tempo real", () => {
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(signupForm).toContain('describedBy="signup-password-strength"');
    expect(signupForm).toContain('id="signup-password-strength"');
    expect(signupForm).toContain("password={password}");
    expect(signupForm).toContain("value={password}");
    expect(signupForm).toContain(
      "setPassword(event.currentTarget.value)",
    );
    expect(signupForm).toContain("minLength={8}");
  });

  it("não mantém o indicador nem as senhas montados após o sucesso", () => {
    const signupForm = source("components/auth/SignupForm.tsx");
    const successComponent = signupForm.slice(
      signupForm.indexOf("function SignupOtpStep"),
      signupForm.indexOf("type SignupActionFlowProps"),
    );

    expect(signupForm).toContain(
      'if (state.status === "signup-success")',
    );
    expect(signupForm).toContain("return emailOtpEnabled ?");
    expect(signupForm).toContain("<SignupOtpStep");
    expect(signupForm).toContain("<SignupEmailLinkStep");
    expect(successComponent).not.toContain("PasswordStrength");
    expect(successComponent).not.toContain('name="password"');
  });

  it("não anuncia correspondência antes de a confirmação ser tocada", () => {
    const markup = renderPasswordMatch({
      id: "match-status",
      password: "valid-password",
      confirmation: "",
      hasStarted: false,
    });

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).not.toContain("coincidem");
  });

  it("anuncia divergência e correspondência sem depender apenas de cor", () => {
    const mismatch = renderPasswordMatch({
      id: "match-status",
      password: "valid-password",
      confirmation: "different-password",
      hasStarted: true,
    });
    const match = renderPasswordMatch({
      id: "match-status",
      password: "valid-password",
      confirmation: "valid-password",
      hasStarted: true,
    });

    expect(mismatch).toContain("As senhas ainda não coincidem.");
    expect(match).toContain("As senhas coincidem.");
    expect(mismatch).toContain("<svg");
    expect(match).toContain("<svg");
  });

  it("mantém o erro do servidor prioritário ao status em tempo real", () => {
    const markup = renderPasswordMatch({
      id: "match-status",
      password: "valid-password",
      confirmation: "different-password",
      hasStarted: true,
      serverError: "Erro validado no servidor.",
    });

    expect(markup).not.toContain("ainda não coincidem");
    expect(source("components/auth/SignupForm.tsx")).toContain(
      "error={confirmPasswordError}",
    );
  });
});

describe("aviso reutilizável de Caps Lock", () => {
  it("lê os estados ativo e inativo sem observar teclas globalmente", () => {
    expect(
      readCapsLockState({
        getModifierState: (key: string) => key === "CapsLock",
      }),
    ).toBe(true);
    expect(
      readCapsLockState({ getModifierState: () => false }),
    ).toBe(false);
    expect(readCapsLockState({})).toBeNull();

    const passwordField = source("components/auth/PasswordField.tsx");
    expect(passwordField).toContain('getModifierState("CapsLock")');
    expect(passwordField).toContain("onKeyDown={updateCapsLock}");
    expect(passwordField).toContain("onKeyUp={updateCapsLock}");
    expect(passwordField).toContain("onFocus={updateCapsLockOnFocus}");
    expect(passwordField).toContain(
      "onBlur={() => setIsCapsLockOn(false)}",
    );
    expect(passwordField).not.toContain("addEventListener");
  });

  it("mostra e esconde o aviso acessível sem alterar o valor do campo", () => {
    const active = renderToStaticMarkup(
      createElement(CapsLockNotice, {
        id: "caps-status",
        isActive: true,
      }),
    );
    const inactive = renderToStaticMarkup(
      createElement(CapsLockNotice, {
        id: "caps-status",
        isActive: false,
      }),
    );
    const passwordField = source("components/auth/PasswordField.tsx");

    expect(active).toContain("Caps Lock está ativado.");
    expect(active).toContain('role="status"');
    expect(active).toContain('aria-live="polite"');
    expect(inactive).not.toContain("Caps Lock está ativado.");
    expect(passwordField).toContain("value={value}");
    expect(passwordField).toContain("onChange={onChange}");
  });
});

describe("reenvio na tela de sucesso", () => {
  it("usa OTP como fluxo principal do cadastro", () => {
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(signupForm).toContain("verifySignupOtpAction");
    expect(signupForm).toContain('id="signup-otp"');
    expect(signupForm).not.toContain("subscribeToAuthFlowEvent");
  });

  it("limita a região live ao conteúdo informativo", () => {
    const signupForm = source("components/auth/SignupForm.tsx");
    const otpStep = signupForm.slice(
      signupForm.indexOf("function SignupOtpStep"),
      signupForm.indexOf("type SignupActionFlowProps"),
    );
    const liveRegionMatch = otpStep.match(
      /<div role="status" aria-live="polite">([\s\S]*?)<form[\s\S]*?action=\{verifyAction\}/,
    );
    const liveRegion = liveRegionMatch?.[1] ?? "";

    expect(signupForm).toContain('<div className="text-center">');
    expect(signupForm).not.toContain(
      '<div role="status" className="text-center">',
    );
    expect(liveRegion).toContain("<MailCheck");
    expect(liveRegion).toContain(
      "Confirme seu e-mail",
    );
    expect(liveRegion).toContain(
      "Digite o código enviado ao seu e-mail",
    );
    expect(liveRegion).not.toContain("<Link");
    expect(liveRegion).not.toContain("<form");
    expect(liveRegion).not.toContain("Reenviar código");
  });

  it("oferece reenvio sem incluir senha no formulário secundário", () => {
    const signupForm = source("components/auth/SignupForm.tsx");
    const resendActionIndex = signupForm.indexOf(
      "action={resendAction}",
    );
    const resendFormStart = signupForm.lastIndexOf(
      "<form",
      resendActionIndex,
    );
    const resendForm = signupForm.slice(
      resendFormStart,
      signupForm.indexOf("</form>", resendActionIndex),
    );

    expect(signupForm).toContain("Reenviar código");
    expect(resendForm).toContain(
      '<input type="hidden" name="email" value={email} />',
    );
    expect(resendForm).not.toContain('name="password"');
  });

  it("bloqueia envios simultâneos e inicia cooldown local de 60 segundos", () => {
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(signupForm).toContain("aria-busy={isResending}");
    expect(signupForm).toContain(
      "disabled={isResending || isCooldownActive}",
    );
    expect(signupForm).toContain(
      'result.status === "confirmation-resent"',
    );
    expect(signupForm).toContain(
      "setCooldownRemaining(RESEND_COOLDOWN_SECONDS)",
    );
    expect(signupForm).toContain("const RESEND_COOLDOWN_SECONDS = 60");
    expect(signupForm).toContain("window.setTimeout");
    expect(signupForm).toContain("window.clearTimeout(timer)");
    expect(signupForm).toContain("Reenviar em {cooldownRemaining}s");
    expect(signupForm).toContain("motion-reduce:animate-none");
  });

  it("usa a cópia pública final sem exibir o endereço", () => {
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(signupForm).toContain(
      "Confirme seu e-mail",
    );
    expect(signupForm).toContain(
      "Você pode já possuir uma conta.",
    );
    expect(signupForm).toContain(
      "Por segurança, não confirmamos publicamente se um endereço está",
    );
    expect(signupForm).not.toContain("{email}</");
  });
});

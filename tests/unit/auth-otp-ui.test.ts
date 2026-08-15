import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  Children,
  createElement,
  isValidElement,
  type ChangeEvent,
  type ClipboardEvent,
  type InputHTMLAttributes,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OtpCodeField } from "@/components/auth/OtpCodeField";
import {
  AUTH_EMAIL_OTP_LENGTH,
  AUTH_EMAIL_OTP_PATTERN,
  normalizeEmailOtp,
} from "@/lib/auth/otp";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function renderOtpInput() {
  const updateValue = vi.fn();
  const field = OtpCodeField({
    id: "interactive-otp",
    value: "",
    onChange: updateValue,
  });
  const input = Children.toArray(field.props.children).find(
    (child) => isValidElement(child) && child.type === "input",
  );

  if (!isValidElement<InputHTMLAttributes<HTMLInputElement>>(input)) {
    throw new Error("Campo OTP não encontrado no componente.");
  }

  return { input: input.props, updateValue };
}

describe("campo OTP reutilizável", () => {
  it("normaliza colagem e limita o código à configuração central", () => {
    expect(AUTH_EMAIL_OTP_LENGTH).toBe(6);
    expect(AUTH_EMAIL_OTP_PATTERN).toBe("[0-9]{6}");
    expect(normalizeEmailOtp(" 12-3a 45_678 ")).toBe("123456");
    expect(normalizeEmailOtp("abc")).toBe("");
  });

  it("renderiza um único input controlado e acessível", () => {
    const markup = renderToStaticMarkup(
      createElement(OtpCodeField, {
        id: "test-otp",
        value: "123456",
        onChange: vi.fn(),
        error: "Código inválido.",
      }),
    );

    expect(markup).toContain('for="test-otp"');
    expect(markup).toContain("Código de verificação");
    expect(markup).toContain('name="token"');
    expect(markup).toContain('type="text"');
    expect(markup).toContain('inputMode="numeric"');
    expect(markup).toContain('autoComplete="one-time-code"');
    expect(markup).toContain('enterKeyHint="done"');
    expect(markup).toContain('pattern="[0-9]{6}"');
    expect(markup).not.toMatch(/maxlength/i);
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain(
      'aria-describedby="test-otp-help test-otp-error"',
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("tabular-nums");
    expect(markup).toContain("max-w-[18rem]");
    expect(markup).toContain("min-h-14");
    expect(markup.match(/<input/g)).toHaveLength(1);
  });

  it.each([
    ["123456", "123456"],
    ["123-456", "123456"],
    ["123 456", "123456"],
    ["código: 12a3-456-789", "123456"],
  ])("normaliza a colagem de %s para %s", (clipboardText, expected) => {
    const { input, updateValue } = renderOtpInput();
    const preventDefault = vi.fn();
    const getData = vi.fn().mockReturnValue(clipboardText);

    input.onPaste?.({
      clipboardData: { getData },
      preventDefault,
    } as unknown as ClipboardEvent<HTMLInputElement>);

    expect(getData).toHaveBeenCalledWith("text");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(updateValue).toHaveBeenCalledWith(expected);
  });

  it("limita também a digitação aos seis primeiros dígitos", () => {
    const { input, updateValue } = renderOtpInput();

    input.onChange?.({
      currentTarget: { value: "123456789" },
    } as unknown as ChangeEvent<HTMLInputElement>);

    expect(updateValue).toHaveBeenCalledWith("123456");
  });

  it("não intercepta atalhos nem registra o conteúdo digitado", () => {
    const field = source("components/auth/OtpCodeField.tsx");

    expect(field).toContain("normalizeEmailOtp(event.currentTarget.value)");
    expect(field).not.toMatch(
      /onKeyDown|console\.|localStorage|sessionStorage/,
    );
  });
});

describe("etapas OTP de autenticação", () => {
  it("mostra somente confirmação por link no cadastro", () => {
    const signup = source("components/auth/SignupForm.tsx");
    const linkStep = signup.slice(
      signup.indexOf("function SignupEmailLinkStep"),
      signup.indexOf("type SignupActionFlowProps"),
    );

    expect(linkStep).toContain("Confira seu e-mail");
    expect(linkStep).toContain(
      "Enviamos um link para confirmar sua conta.",
    );
    expect(linkStep).toContain(
      '<input type="hidden" name="email" value={email} />',
    );
    expect(linkStep).not.toContain('name="password"');
    expect(linkStep).not.toContain("PasswordStrength");
    expect(linkStep).not.toContain("{email}</");
    expect(linkStep).toContain("Entrar");
    expect(linkStep).toContain("Reenviar confirmação");
    expect(linkStep).toContain("Trocar e-mail");
    expect(linkStep).not.toContain("OtpCodeField");
    expect(linkStep).not.toMatch(/Digite o código|Verificar código/);
  });

  it("mostra a etapa de recuperação com OTP como único fluxo atual", () => {
    const recovery = source("components/auth/ForgotPasswordForm.tsx");
    const otpStep = recovery.slice(
      recovery.indexOf("function RecoveryOtpStep"),
      recovery.indexOf("type RecoveryActionFlowProps"),
    );

    expect(otpStep).toContain("Verifique sua identidade");
    expect(otpStep).toContain(
      "Digite o código enviado ao seu e-mail para continuar a recuperação",
    );
    expect(otpStep).toContain('id="recovery-otp"');
    expect(otpStep).toContain("Verificar código");
    expect(otpStep).toContain("Reenviar código");
    expect(otpStep).toContain("Trocar e-mail");
    expect(otpStep).toContain("Voltar para entrar");
    expect(otpStep).toContain("Criar conta");
    expect(otpStep).not.toMatch(/link do e-mail|alternativa para continuar/i);
    expect(otpStep).not.toContain("{email}</");
  });

  it("reinicia cada fluxo ao trocar o e-mail e restaura o foco", () => {
    for (const file of [
      "components/auth/SignupForm.tsx",
      "components/auth/ForgotPasswordForm.tsx",
    ]) {
      const form = source(file);

      expect(form).toContain("key={attemptNumber}");
      expect(form).toContain("autoFocusEmail={attemptNumber > 0}");
      expect(form).toContain(
        "setAttemptNumber((current) => current + 1)",
      );
    }

    expect(source("components/auth/SignupForm.tsx")).not.toContain(
      "setToken(\"\")",
    );
    expect(source("components/auth/ForgotPasswordForm.tsx")).toContain(
      "setToken(\"\")",
    );
  });

  it("não anuncia a contagem regressiva a cada segundo", () => {
    for (const file of [
      "components/auth/SignupForm.tsx",
      "components/auth/ForgotPasswordForm.tsx",
    ]) {
      const form = source(file);

      expect(form).toContain('<span aria-hidden="true">Reenviar em');
      expect(form).toContain("Reenvio temporariamente indisponível");
      expect(form).toContain("motion-reduce:animate-none");
    }
  });
});

describe("limpeza da sincronização antiga", () => {
  it("remove canal, página intermediária e listeners", () => {
    expect(existsSync(join(process.cwd(), "lib/auth/cross-tab.ts"))).toBe(
      false,
    );
    expect(
      existsSync(
        join(process.cwd(), "components/auth/AuthFlowCompletion.tsx"),
      ),
    ).toBe(false);
    expect(existsSync(join(process.cwd(), "app/auth/page.tsx"))).toBe(
      false,
    );

    const authSources = [
      source("components/auth/SignupForm.tsx"),
      source("components/auth/ForgotPasswordForm.tsx"),
      source("app/auth/callback/route.ts"),
      source("lib/auth/routes.ts"),
    ].join("\n");

    expect(authSources).not.toMatch(
      /BroadcastChannel|signup-confirmed|recovery-ready|cross-tab/,
    );
  });
});

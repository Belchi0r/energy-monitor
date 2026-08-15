import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  assessPasswordStrength,
  PasswordStrength,
} from "@/components/auth/PasswordStrength";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("interface de recuperação de senha", () => {
  it("oferece Esqueci minha senha no login", () => {
    const loginForm = source("components/auth/LoginForm.tsx");

    expect(loginForm).toContain('href="/forgot-password"');
    expect(loginForm).toContain("Esqueci minha senha");
  });

  it("oferece ações profissionais após erro genérico de login", () => {
    const loginForm = source("components/auth/LoginForm.tsx");
    const actions = source("app/auth/actions.ts");

    expect(actions).toContain(
      "Não foi possível entrar com esses dados. Confira o e-mail e a senha.",
    );
    expect(loginForm).toContain('state.status === "error"');
    expect(loginForm).toContain("Ainda não possui conta?");
    expect(loginForm).toContain("Criar conta");
    expect(loginForm).toContain("Esqueceu sua senha?");
    expect(loginForm).toContain("Recuperar acesso");
    expect(loginForm).not.toMatch(
      /e-mail não está cadastrado|conta não encontrada|senha está incorreta/i,
    );
  });

  it("mantém os autocompletes adequados em todos os fluxos", () => {
    expect(source("components/auth/LoginForm.tsx")).toContain(
      'autoComplete="email"',
    );
    expect(source("components/auth/LoginForm.tsx")).toContain(
      'autoComplete="current-password"',
    );
    expect(source("components/auth/SignupForm.tsx")).toContain(
      'autoComplete="email"',
    );
    expect(
      source("components/auth/SignupForm.tsx").match(
        /autoComplete="new-password"/g,
      ),
    ).toHaveLength(2);
    expect(source("components/auth/ForgotPasswordForm.tsx")).toContain(
      'autoComplete="email"',
    );
    expect(
      source("components/auth/ResetPasswordForm.tsx").match(
        /autoComplete="new-password"/g,
      ),
    ).toHaveLength(2);
  });

  it("mostra a ação Entrar após o cadastro", () => {
    const signupForm = source("components/auth/SignupForm.tsx");

    expect(signupForm).toContain('href="/login"');
    expect(signupForm).toContain("Entrar");
    expect(signupForm).toContain("Confira seu e-mail");
  });

  it("mantém loading, bloqueio de reenvio e aria-busy nos formulários", () => {
    for (const file of [
      "components/auth/LoginForm.tsx",
      "components/auth/SignupForm.tsx",
      "components/auth/ForgotPasswordForm.tsx",
      "components/auth/ResetPasswordForm.tsx",
    ]) {
      const form = source(file);

      expect(form).toContain("aria-busy={isPending}");
      expect(form).toContain("disabled={isPending}");
    }
  });

  it("oferece indicador de força acessível sem impor regras adicionais", () => {
    expect(assessPasswordStrength("curta").label).toBe("Fraca");
    expect(assessPasswordStrength("Longer#Key2026").label).toBe("Forte");

    const markup = renderToStaticMarkup(
      createElement(PasswordStrength, {
        id: "strength-help",
        password: "Longer#Key2026",
      }),
    );

    expect(markup).toContain('role="meter"');
    expect(markup).toContain('aria-valuetext="Forte"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("apenas orientações");
  });

  it("protege a página e a action com o contexto de recuperação do servidor", () => {
    const page = source("app/reset-password/page.tsx");
    const actions = source("app/auth/actions.ts");

    expect(page).toContain("getRecoveryAuthContext()");
    expect(page).toContain("recovery-session-required");
    expect(actions).toContain("getRecoveryAuthContext()");
    expect(actions).toContain("supabase.auth.updateUser");
  });

  it("usa OTP na recuperação sem contornar a prova do servidor", () => {
    const forgotPasswordForm = source(
      "components/auth/ForgotPasswordForm.tsx",
    );
    const resetPage = source("app/reset-password/page.tsx");

    expect(forgotPasswordForm).toContain("verifyRecoveryOtpAction");
    expect(forgotPasswordForm).toContain('id="recovery-otp"');
    expect(forgotPasswordForm).not.toMatch(
      /link do e-mail|alternativa para continuar/i,
    );
    expect(resetPage).toContain("getRecoveryAuthContext()");
  });

  it("mantém o callback direto como fallback secundário", () => {
    const callback = source("app/auth/callback/route.ts");

    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).toContain('createPrivateRedirect(request, "/")');
    expect(callback).toContain(
      'createPrivateRedirect(request, "/reset-password")',
    );
    expect(callback).not.toContain("signup-confirmed");
    expect(callback).not.toContain("recovery-ready");
  });

  it("mantém erros de validação associados aos campos de senha", () => {
    const resetForm = source("components/auth/ResetPasswordForm.tsx");
    const passwordField = source("components/auth/PasswordField.tsx");

    expect(resetForm).toContain("!hasFieldErrors");
    expect(resetForm).toContain("error={passwordError}");
    expect(resetForm).toContain("error={confirmPasswordError}");
    expect(passwordField).toContain("aria-invalid={Boolean(error)}");
    expect(passwordField).toContain(
      "aria-describedby={descriptionIds || undefined}",
    );
  });
});

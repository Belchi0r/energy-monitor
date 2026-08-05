"use client";

import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
} from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signupAction } from "@/app/auth/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { INITIAL_AUTH_ACTION_STATE } from "@/lib/auth/state";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    INITIAL_AUTH_ACTION_STATE,
  );
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];
  const confirmPasswordError = state.fieldErrors?.confirmPassword?.[0];

  if (state.status === "signup-success") {
    return (
      <div role="status" className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
          <MailCheck aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Verifique seu e-mail
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {state.message} Abra a mensagem e use o link para ativar o acesso.
        </p>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm text-slate-400">
          <p className="flex gap-2">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-emerald-300"
            />
            O envio pode levar alguns minutos. Confira também a pasta de spam.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-white/[0.04] hover:text-white motion-reduce:transition-none"
        >
          Voltar para o login
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="signup-email"
          className="block text-sm font-medium text-slate-200"
        >
          E-mail
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "signup-email-error" : undefined}
          placeholder="voce@exemplo.com"
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-400 focus:bg-slate-950 focus:ring-3 focus:ring-emerald-400/15 motion-reduce:transition-none"
        />
        {emailError ? (
          <p id="signup-email-error" className="mt-2 text-sm text-rose-300">
            {emailError}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="signup-password"
        name="password"
        label="Senha"
        autoComplete="new-password"
        minLength={8}
        error={passwordError}
      />

      <PasswordField
        id="signup-confirm-password"
        name="confirmPassword"
        label="Confirmar senha"
        autoComplete="new-password"
        minLength={8}
        error={confirmPasswordError}
      />

      <p className="text-xs leading-5 text-slate-500">
        Use pelo menos 8 caracteres. Sua senha é enviada somente para o fluxo
        seguro de autenticação e nunca aparece em respostas da aplicação.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,transform,box-shadow] hover:bg-emerald-300 hover:shadow-emerald-950/45 active:translate-y-px disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none motion-reduce:transition-none"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        <span>{isPending ? "Criando conta..." : "Criar conta"}</span>
        {!isPending ? (
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : null}
      </button>

      <p className="text-center text-sm text-slate-400">
        Já possui uma conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}

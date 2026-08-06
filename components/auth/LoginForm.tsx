"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/auth/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { INITIAL_AUTH_ACTION_STATE } from "@/lib/auth/state";

type LoginFormProps = {
  nextPath: string;
  notice?: string;
  noticeTone?: "info" | "error";
};

export function LoginForm({
  nextPath,
  notice,
  noticeTone = "info",
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_AUTH_ACTION_STATE,
  );
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="space-y-5"
      noValidate
    >
      <input type="hidden" name="next" value={nextPath} />

      {notice ? (
        <div
          role={noticeTone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm leading-5 ${
            noticeTone === "error"
              ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
              : "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
          }`}
        >
          {notice}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <div className="space-y-3">
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200"
          >
            {state.message}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-300">
            <p>
              Ainda não possui conta?{" "}
              <Link
                href="/signup"
                className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
              >
                Criar conta
              </Link>
            </p>
            <p>
              Esqueceu sua senha?{" "}
              <Link
                href="/forgot-password"
                className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
              >
                Recuperar acesso
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-slate-200"
        >
          E-mail
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "login-email-error" : undefined}
          placeholder="voce@exemplo.com"
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-400 focus:bg-slate-950 focus:ring-3 focus:ring-emerald-400/15 motion-reduce:transition-none"
        />
        {emailError ? (
          <p id="login-email-error" className="mt-2 text-sm text-rose-300">
            {emailError}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="login-password"
        name="password"
        label="Senha"
        autoComplete="current-password"
        error={passwordError}
      />

      {state.status !== "error" ? (
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,transform,box-shadow] hover:bg-emerald-300 hover:shadow-emerald-950/45 active:translate-y-px disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none motion-reduce:transition-none"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        <span>{isPending ? "Entrando..." : "Entrar"}</span>
        {!isPending ? (
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : null}
      </button>

      {state.status !== "error" ? (
        <p className="text-center text-sm text-slate-400">
          Ainda não tem uma conta?{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { updatePasswordAction } from "@/app/auth/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { INITIAL_AUTH_ACTION_STATE } from "@/lib/auth/state";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    INITIAL_AUTH_ACTION_STATE,
  );
  const passwordError = state.fieldErrors?.password?.[0];
  const confirmPasswordError = state.fieldErrors?.confirmPassword?.[0];
  const hasFieldErrors = Boolean(passwordError || confirmPasswordError);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="space-y-4 sm:space-y-5"
      noValidate
    >
      {state.status === "error" && state.message && !hasFieldErrors ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <PasswordField
          id="reset-password"
          name="password"
          label="Nova senha"
          autoComplete="new-password"
          minLength={8}
          error={passwordError}
          describedBy="reset-password-strength"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <PasswordStrength id="reset-password-strength" password={password} />
      </div>

      <PasswordField
        id="reset-confirm-password"
        name="confirmPassword"
        label="Confirmar nova senha"
        autoComplete="new-password"
        minLength={8}
        error={confirmPasswordError}
      />

      <button
        type="submit"
        disabled={isPending}
        className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,transform,box-shadow] hover:bg-emerald-300 hover:shadow-emerald-950/45 active:translate-y-px disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none motion-reduce:transition-none"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        <span>{isPending ? "Atualizando..." : "Atualizar senha"}</span>
        {!isPending ? (
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : null}
      </button>
    </form>
  );
}

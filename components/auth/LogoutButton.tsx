"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useActionState } from "react";

import { logoutAction } from "@/app/auth/actions";
import { INITIAL_LOGOUT_ACTION_STATE } from "@/lib/auth/state";

type LogoutButtonProps = {
  variant?: "dark" | "light";
  compact?: boolean;
};

export function LogoutButton({
  variant = "light",
  compact = false,
}: LogoutButtonProps) {
  const [state, formAction, isPending] = useActionState(
    logoutAction,
    INITIAL_LOGOUT_ACTION_STATE,
  );
  const colorClasses =
    variant === "dark"
      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

  return (
    <form
      action={formAction}
      className={`relative ${compact ? "" : "w-full"}`}
    >
      <button
        type="submit"
        disabled={isPending}
        aria-label={isPending ? "Logout em andamento" : "Sair da conta"}
        className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold shadow-sm transition-[border-color,background-color,color] disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none ${colorClasses} ${
          compact ? "px-3" : "w-full px-4"
        }`}
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="size-4" />
        )}
        <span aria-live="polite">{isPending ? "Saindo..." : "Sair"}</span>
      </button>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-5 ${
            variant === "dark"
              ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
              : "border-rose-200 bg-rose-50 text-rose-700"
          } ${compact ? "absolute right-0 top-full z-50 w-72 shadow-lg" : ""}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

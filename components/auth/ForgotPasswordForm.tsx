"use client";

import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  forgotPasswordAction,
  resendRecoveryCodeAction,
  verifyRecoveryOtpAction,
} from "@/app/auth/actions";
import { OtpCodeField } from "@/components/auth/OtpCodeField";
import {
  INITIAL_AUTH_ACTION_STATE,
  INITIAL_OTP_ACTION_STATE,
  INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
  type AuthActionState,
  type RecoveryCodeResendActionState,
} from "@/lib/auth/state";

const RESEND_COOLDOWN_SECONDS = 60;

type RecoveryRequestFormProps = {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  state: AuthActionState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  autoFocusEmail: boolean;
};

function RecoveryRequestForm({
  email,
  setEmail,
  state,
  formAction,
  isPending,
  autoFocusEmail,
}: RecoveryRequestFormProps) {
  const emailError = state.fieldErrors?.email?.[0];

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="space-y-4 sm:space-y-5"
      noValidate
    >
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="recovery-email"
          className="block text-sm font-medium text-slate-200"
        >
          E-mail
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          required
          autoFocus={autoFocusEmail}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          aria-invalid={Boolean(emailError)}
          aria-describedby={
            emailError ? "recovery-email-error" : "recovery-email-help"
          }
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-400 focus:bg-slate-950 focus:ring-3 focus:ring-emerald-400/15 motion-reduce:transition-none"
          placeholder="voce@exemplo.com"
        />
        {emailError ? (
          <p id="recovery-email-error" className="mt-2 text-sm text-rose-300">
            {emailError}
          </p>
        ) : (
          <p id="recovery-email-help" className="mt-2 text-xs text-slate-500">
            A resposta não informará se existe uma conta para este endereço.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,box-shadow] hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
      >
        {isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {isPending ? "Enviando..." : "Enviar instruções"}
      </button>

      <p className="text-center text-sm text-slate-400">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}

type RecoveryOtpStepProps = {
  email: string;
  onChangeEmail: () => void;
};

function RecoveryEmailLinkStep({
  email,
  onChangeEmail,
}: RecoveryOtpStepProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const resendWithCooldown = useCallback(
    async (
      previousState: RecoveryCodeResendActionState,
      formData: FormData,
    ) => {
      const result = await resendRecoveryCodeAction(
        previousState,
        formData,
      );

      if (result.status === "recovery-code-resent") {
        setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      }

      return result;
    },
    [],
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendWithCooldown,
    INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
  );

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownRemaining]);

  const isCooldownActive = cooldownRemaining > 0;
  const resendMessage =
    resendState.status === "recovery-code-resent"
      ? "Caso exista uma conta associada a este endereço, enviaremos um novo link seguro. Verifique também a pasta de spam."
      : resendState.message;

  return (
    <div className="text-center">
      <div role="status" aria-live="polite">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
          <MailCheck aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Confira seu e-mail
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Caso exista uma conta associada a este endereço, enviaremos um link
          seguro para continuar a recuperação.
        </p>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <form action={resendAction} aria-busy={isResending}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={isResending || isCooldownActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-white/[0.04] hover:text-white disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
          >
            {isResending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isResending ? (
              "Reenviando..."
            ) : isCooldownActive ? (
              <>
                <span aria-hidden="true">Reenviar em {cooldownRemaining}s</span>
                <span className="sr-only">
                  Reenvio temporariamente indisponível
                </span>
              </>
            ) : (
              "Reenviar e-mail"
            )}
          </button>
        </form>

        {resendMessage ? (
          <p
            role={resendState.status === "error" ? "alert" : "status"}
            aria-live={
              resendState.status === "error" ? "assertive" : "polite"
            }
            className={`mt-3 text-sm leading-6 ${
              resendState.status === "error"
                ? "text-rose-300"
                : "text-slate-400"
            }`}
          >
            {resendMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onChangeEmail}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 text-sm font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Trocar e-mail
        </button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
        <Link
          href="/login"
          className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
        >
          Voltar para entrar
        </Link>
        <Link
          href="/signup"
          className="font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}

function RecoveryOtpStep({
  email,
  onChangeEmail,
}: RecoveryOtpStepProps) {
  const [token, setToken] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [verificationState, verifyAction, isVerifying] = useActionState(
    verifyRecoveryOtpAction,
    INITIAL_OTP_ACTION_STATE,
  );
  const resendWithCooldown = useCallback(
    async (
      previousState: RecoveryCodeResendActionState,
      formData: FormData,
    ) => {
      const result = await resendRecoveryCodeAction(
        previousState,
        formData,
      );

      if (result.status === "recovery-code-resent") {
        setToken("");
        setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      }

      return result;
    },
    [],
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendWithCooldown,
    INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
  );

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownRemaining]);

  const tokenError = verificationState.fieldErrors?.token?.[0];
  const isCooldownActive = cooldownRemaining > 0;
  const resendMessage =
    resendState.status === "recovery-code-resent"
      ? "Caso exista uma recuperação disponível para este endereço, enviaremos um novo código. Verifique também a pasta de spam."
      : resendState.message;

  return (
    <div className="text-center">
      <div role="status" aria-live="polite">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
          <MailCheck aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Verifique sua identidade
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Digite o código enviado ao seu e-mail para continuar a recuperação
          neste dispositivo.
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Mantenha esta página aberta. Você pode consultar o código pelo celular
          e digitá-lo aqui.
        </p>
      </div>

      <form
        action={verifyAction}
        aria-busy={isVerifying}
        className="mt-6 space-y-4"
        noValidate
      >
        <input type="hidden" name="email" value={email} />
        {verificationState.status === "error" &&
        verificationState.message ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-left text-sm leading-5 text-rose-200"
          >
            {verificationState.message}
          </div>
        ) : null}
        <OtpCodeField
          id="recovery-otp"
          value={token}
          onChange={setToken}
          error={tokenError}
        />
        <button
          type="submit"
          disabled={isVerifying}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,box-shadow] hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
        >
          {isVerifying ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {isVerifying ? "Verificando..." : "Verificar código"}
        </button>
      </form>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-xs leading-5 text-slate-400">
        <p>
          Por segurança, a mesma resposta é exibida mesmo quando não podemos
          confirmar a existência da conta.
        </p>
        <p className="mt-2">
          Para continuar a recuperação, volte a esta página e digite o código
          recebido por e-mail.
        </p>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <form action={resendAction} aria-busy={isResending}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={isResending || isCooldownActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-white/[0.04] hover:text-white disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
          >
            {isResending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isResending ? (
              "Reenviando..."
            ) : isCooldownActive ? (
              <>
                <span aria-hidden="true">Reenviar em {cooldownRemaining}s</span>
                <span className="sr-only">
                  Reenvio temporariamente indisponível
                </span>
              </>
            ) : (
              "Reenviar código"
            )}
          </button>
        </form>

        {resendMessage ? (
          <p
            role={resendState.status === "error" ? "alert" : "status"}
            aria-live={
              resendState.status === "error" ? "assertive" : "polite"
            }
            className={`mt-3 text-sm leading-6 ${
              resendState.status === "error"
                ? "text-rose-300"
                : "text-slate-400"
            }`}
          >
            {resendMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onChangeEmail}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 text-sm font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Trocar e-mail
        </button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
        <Link
          href="/login"
          className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
        >
          Voltar para entrar
        </Link>
        <Link
          href="/signup"
          className="font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}

type RecoveryActionFlowProps = {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  emailOtpEnabled: boolean;
  autoFocusEmail: boolean;
  onChangeEmail: () => void;
};

function RecoveryActionFlow({
  email,
  setEmail,
  emailOtpEnabled,
  autoFocusEmail,
  onChangeEmail,
}: RecoveryActionFlowProps) {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  if (state.status === "recovery-email-sent") {
    return emailOtpEnabled ? (
      <RecoveryOtpStep email={email} onChangeEmail={onChangeEmail} />
    ) : (
      <RecoveryEmailLinkStep email={email} onChangeEmail={onChangeEmail} />
    );
  }

  return (
    <RecoveryRequestForm
      email={email}
      setEmail={setEmail}
      state={state}
      formAction={formAction}
      isPending={isPending}
      autoFocusEmail={autoFocusEmail}
    />
  );
}

type ForgotPasswordFormProps = {
  emailOtpEnabled: boolean;
};

export function ForgotPasswordForm({
  emailOtpEnabled,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(0);

  return (
    <RecoveryActionFlow
      key={attemptNumber}
      email={email}
      setEmail={setEmail}
      emailOtpEnabled={emailOtpEnabled}
      autoFocusEmail={attemptNumber > 0}
      onChangeEmail={() => setAttemptNumber((current) => current + 1)}
    />
  );
}

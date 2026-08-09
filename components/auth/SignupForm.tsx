"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
} from "lucide-react";
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
  resendSignupConfirmationAction,
  signupAction,
  verifySignupOtpAction,
} from "@/app/auth/actions";
import { OtpCodeField } from "@/components/auth/OtpCodeField";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordMatchStatus } from "@/components/auth/PasswordMatchStatus";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import {
  INITIAL_AUTH_ACTION_STATE,
  INITIAL_OTP_ACTION_STATE,
  INITIAL_RESEND_CONFIRMATION_ACTION_STATE,
  type AuthActionState,
  type ResendConfirmationActionState,
} from "@/lib/auth/state";

const RESEND_COOLDOWN_SECONDS = 60;

type SignupFieldsProps = {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  state: AuthActionState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  autoFocusEmail: boolean;
};

function SignupFields({
  email,
  setEmail,
  state,
  formAction,
  isPending,
  autoFocusEmail,
}: SignupFieldsProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hasStartedConfirmation, setHasStartedConfirmation] =
    useState(false);
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];
  const confirmPasswordError = state.fieldErrors?.confirmPassword?.[0];

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="space-y-5"
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
          autoFocus={autoFocusEmail}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
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

      <div>
        <PasswordField
          id="signup-password"
          name="password"
          label="Senha"
          autoComplete="new-password"
          minLength={8}
          error={passwordError}
          describedBy="signup-password-strength"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <PasswordStrength
          id="signup-password-strength"
          password={password}
        />
      </div>

      <div>
        <PasswordField
          id="signup-confirm-password"
          name="confirmPassword"
          label="Confirmar senha"
          autoComplete="new-password"
          minLength={8}
          error={confirmPasswordError}
          describedBy="signup-password-match"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.currentTarget.value);
            setHasStartedConfirmation(true);
          }}
        />
        <PasswordMatchStatus
          id="signup-password-match"
          password={password}
          confirmation={confirmation}
          hasStarted={hasStartedConfirmation}
          serverError={confirmPasswordError}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,transform,box-shadow] hover:bg-emerald-300 hover:shadow-emerald-950/45 active:translate-y-px disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none motion-reduce:transition-none"
      >
        {isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
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

type SignupOtpStepProps = {
  email: string;
  onChangeEmail: () => void;
};

function SignupEmailLinkStep({
  email,
  onChangeEmail,
}: SignupOtpStepProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const resendWithCooldown = useCallback(
    async (
      previousState: ResendConfirmationActionState,
      formData: FormData,
    ) => {
      const result = await resendSignupConfirmationAction(
        previousState,
        formData,
      );

      if (result.status === "confirmation-resent") {
        setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      }

      return result;
    },
    [],
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendWithCooldown,
    INITIAL_RESEND_CONFIRMATION_ACTION_STATE,
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
    resendState.status === "confirmation-resent"
      ? "Caso uma confirmação esteja pendente para este endereço, enviaremos um novo link seguro. Verifique também a pasta de spam."
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
          Enviamos as próximas instruções quando aplicável. Abra o e-mail
          recebido neste dispositivo para concluir o cadastro.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm leading-6 text-slate-400">
        Você pode já possuir uma conta. Nesse caso, entre com sua senha ou
        recupere o acesso.
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-white/[0.04] hover:text-white motion-reduce:transition-none"
        >
          Entrar
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
        >
          Esqueci minha senha
        </Link>
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
              "Reenviar confirmação"
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
    </div>
  );
}

function SignupOtpStep({ email, onChangeEmail }: SignupOtpStepProps) {
  const [token, setToken] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [verificationState, verifyAction, isVerifying] = useActionState(
    verifySignupOtpAction,
    INITIAL_OTP_ACTION_STATE,
  );
  const resendWithCooldown = useCallback(
    async (
      previousState: ResendConfirmationActionState,
      formData: FormData,
    ) => {
      const result = await resendSignupConfirmationAction(
        previousState,
        formData,
      );

      if (result.status === "confirmation-resent") {
        setToken("");
        setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      }

      return result;
    },
    [],
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendWithCooldown,
    INITIAL_RESEND_CONFIRMATION_ACTION_STATE,
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
  const tokenError = verificationState.fieldErrors?.token?.[0];
  const resendMessage =
    resendState.status === "confirmation-resent"
      ? "Caso uma confirmação esteja pendente para este endereço, enviaremos um novo código. Verifique também a pasta de spam."
      : resendState.message;

  return (
    <div className="text-center">
      <div role="status" aria-live="polite">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
          <MailCheck aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">
          Confirme seu e-mail
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Digite o código enviado ao seu e-mail para concluir o cadastro neste
          dispositivo.
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
          id="signup-otp"
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
        <p className="flex gap-2">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-emerald-300"
          />
          Por segurança, não confirmamos publicamente se um endereço está
          cadastrado.
        </p>
        <p className="mt-2">
          Você pode já possuir uma conta. Nesse caso, entre com sua senha ou
          recupere o acesso.
        </p>
        <p className="mt-2">
          Para concluir neste dispositivo, volte a esta página e digite o código
          recebido por e-mail.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-white/[0.04] hover:text-white motion-reduce:transition-none"
        >
          Entrar
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
        >
          Esqueci minha senha
        </Link>
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
    </div>
  );
}

type SignupActionFlowProps = {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  emailOtpEnabled: boolean;
  autoFocusEmail: boolean;
  onChangeEmail: () => void;
};

function SignupActionFlow({
  email,
  setEmail,
  emailOtpEnabled,
  autoFocusEmail,
  onChangeEmail,
}: SignupActionFlowProps) {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  if (state.status === "signup-success") {
    return emailOtpEnabled ? (
      <SignupOtpStep email={email} onChangeEmail={onChangeEmail} />
    ) : (
      <SignupEmailLinkStep email={email} onChangeEmail={onChangeEmail} />
    );
  }

  return (
    <SignupFields
      email={email}
      setEmail={setEmail}
      state={state}
      formAction={formAction}
      isPending={isPending}
      autoFocusEmail={autoFocusEmail}
    />
  );
}

type SignupFormProps = {
  emailOtpEnabled: boolean;
  publicSignupEnabled: boolean;
};

export function PublicSignupUnavailable() {
  return (
    <div className="space-y-3">
      <Link
        href="/demo"
        className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-[background-color,transform,box-shadow] hover:bg-emerald-300 hover:shadow-emerald-950/45 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transform-none motion-reduce:transition-none"
      >
        Explorar demonstração
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
        />
      </Link>
      <Link
        href="/login"
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-white/[0.04] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transition-none"
      >
        Entrar
      </Link>
    </div>
  );
}

function EnabledSignupForm({
  emailOtpEnabled,
}: Pick<SignupFormProps, "emailOtpEnabled">) {
  const [email, setEmail] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(0);

  return (
    <SignupActionFlow
      key={attemptNumber}
      email={email}
      setEmail={setEmail}
      emailOtpEnabled={emailOtpEnabled}
      autoFocusEmail={attemptNumber > 0}
      onChangeEmail={() => setAttemptNumber((current) => current + 1)}
    />
  );
}

export function SignupForm({
  emailOtpEnabled,
  publicSignupEnabled,
}: SignupFormProps) {
  return publicSignupEnabled ? (
    <EnabledSignupForm emailOtpEnabled={emailOtpEnabled} />
  ) : (
    <PublicSignupUnavailable />
  );
}

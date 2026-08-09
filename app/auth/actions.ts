"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { z } from "zod";

import { resolveAppOrigin } from "@/lib/auth/origin";
import { isPublicSignupEnabled } from "@/lib/auth/public-signup-config";
import {
  clearRecoverySessionProof,
  createRecoverySessionProof,
  getRecoveryAuthContext,
  RECOVERY_SESSION_COOKIE,
  RECOVERY_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/recovery-session";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect";
import type {
  AuthActionState,
  AuthFieldErrors,
  LogoutActionState,
  OtpActionState,
  RecoveryCodeResendActionState,
  ResendConfirmationActionState,
} from "@/lib/auth/state";
import {
  extractEmailFormData,
  extractEmailOtpFormData,
  extractResetPasswordFormData,
  emailOtpFormSchema,
  formDataToObject,
  forgotPasswordFormSchema,
  loginFormSchema,
  resetPasswordFormSchema,
  signupFormSchema,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

function invalidFormState(error?: z.ZodError): AuthActionState {
  return {
    status: "error",
    message: "Revise os campos indicados e tente novamente.",
    fieldErrors: error?.flatten().fieldErrors as
      | AuthFieldErrors
      | undefined,
  };
}

function getLoginErrorMessage(error: unknown) {
  if (isRateLimitError(error)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
  }

  return "Não foi possível entrar com esses dados. Confira o e-mail e a senha.";
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

function getErrorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
}

function isRateLimitError(error: unknown) {
  const code = String(getErrorCode(error) ?? "");

  return (
    getErrorStatus(error) === 429 ||
    [
      "over_email_send_rate_limit",
      "over_request_rate_limit",
      "too_many_requests",
    ].includes(code)
  );
}

function rateLimitState(): AuthActionState {
  return {
    status: "error",
    message:
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
  };
}

function signupSuccessState(): AuthActionState {
  return {
    status: "signup-success",
    message:
      "Confira seu e-mail. Você pode já possuir uma conta; nesse caso, entre com sua senha ou recupere o acesso.",
  };
}

function confirmationResentState(): ResendConfirmationActionState {
  return {
    status: "confirmation-resent",
    message:
      "Caso uma confirmação esteja pendente para este endereço, enviaremos novas instruções. Verifique também a pasta de spam.",
  };
}

function recoveryEmailSentState(): AuthActionState {
  return {
    status: "recovery-email-sent",
    message:
      "Caso exista uma recuperação disponível para este endereço, enviaremos novas instruções. Verifique também a pasta de spam.",
  };
}

function recoveryCodeResentState(): RecoveryCodeResendActionState {
  return {
    status: "recovery-code-resent",
    message:
      "Caso exista uma recuperação disponível para este endereço, enviaremos novas instruções. Verifique também a pasta de spam.",
  };
}

function isInvalidOtpError(error: unknown) {
  return [
    "invalid_otp",
    "invalid_token",
    "otp_expired",
    "token_expired",
  ].includes(String(getErrorCode(error) ?? ""));
}

function otpErrorState(
  error: unknown,
  genericMessage: string,
): OtpActionState {
  if (isRateLimitError(error)) {
    return {
      status: "error",
      message:
        "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    };
  }

  return {
    status: "error",
    message: isInvalidOtpError(error)
      ? "O código é inválido ou expirou. Confira os números ou solicite outro."
      : genericMessage,
  };
}

async function discardUntrustedSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Nunca expõe detalhes de uma sessão inconsistente ao cliente.
  }
}

async function hasExpectedCurrentUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  expectedUserId: string,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return !error && user?.id === expectedUserId;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const values = formDataToObject(formData);
  const parsed = values
    ? loginFormSchema.safeParse(values)
    : { success: false as const, error: undefined };

  if (!parsed.success) {
    return invalidFormState(parsed.error);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return {
        status: "error",
        message: getLoginErrorMessage(error),
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "Não foi possível entrar com esses dados. Confira o e-mail e a senha.",
    };
  }

  redirect(resolveSafeRedirectPath(parsed.data.next));
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isPublicSignupEnabled()) {
    return {
      status: "error",
      message:
        "Novos cadastros estão temporariamente indisponíveis. Explore a demonstração ou entre em uma conta existente.",
    };
  }

  const values = formDataToObject(formData);
  const parsed = values
    ? signupFormSchema.safeParse(values)
    : { success: false as const, error: undefined };

  if (!parsed.success) {
    return invalidFormState(parsed.error);
  }

  try {
    const requestHeaders = await headers();
    const appOrigin = resolveAppOrigin(
      requestHeaders,
      process.env.NEXT_PUBLIC_SITE_URL,
    );

    if (!appOrigin) {
      return {
        status: "error",
        message:
          "Não foi possível concluir o cadastro agora. Aguarde um momento e tente novamente.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: new URL("/auth/callback", appOrigin).toString(),
      },
    });

    if (error) {
      if (isRateLimitError(error)) {
        return rateLimitState();
      }

      if (
        ["email_exists", "user_already_exists"].includes(
          String(getErrorCode(error)),
        )
      ) {
        return signupSuccessState();
      }

      return {
        status: "error",
        message:
          "Não foi possível concluir o cadastro agora. Aguarde um momento e tente novamente.",
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "Não foi possível concluir o cadastro agora. Aguarde um momento e tente novamente.",
    };
  }

  return signupSuccessState();
}

export async function verifySignupOtpAction(
  _previousState: OtpActionState,
  formData: FormData,
): Promise<OtpActionState> {
  const extracted = extractEmailOtpFormData(formData);

  if (!extracted.success) {
    return {
      status: "error",
      message: "Revise o código informado e tente novamente.",
      fieldErrors: extracted.fieldErrors,
    };
  }

  const parsed = emailOtpFormSchema.safeParse(extracted.data);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o código informado e tente novamente.",
      fieldErrors: parsed.error.flatten().fieldErrors as Pick<
        AuthFieldErrors,
        "email" | "token"
      >,
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "email",
    });

    if (error) {
      return otpErrorState(
        error,
        "Não foi possível confirmar o código agora. Solicite outro código e tente novamente.",
      );
    }

    if (
      !data.user ||
      !data.session ||
      data.session.user.id !== data.user.id ||
      !(await hasExpectedCurrentUser(supabase, data.user.id))
    ) {
      await discardUntrustedSession(supabase);

      return {
        status: "error",
        message:
          "Não foi possível confirmar o código agora. Solicite outro código e tente novamente.",
      };
    }
  } catch {
    if (supabase) {
      await discardUntrustedSession(supabase);
    }

    return {
      status: "error",
      message:
        "Não foi possível confirmar o código agora. Solicite outro código e tente novamente.",
    };
  }

  redirect("/");
}

export async function resendSignupConfirmationAction(
  _previousState: ResendConfirmationActionState,
  formData: FormData,
): Promise<ResendConfirmationActionState> {
  if (!isPublicSignupEnabled()) {
    return {
      status: "error",
      message:
        "Novos cadastros estão temporariamente indisponíveis. Explore a demonstração ou entre em uma conta existente.",
    };
  }

  const extracted = extractEmailFormData(formData);

  if (!extracted.success) {
    return {
      status: "error",
      message: "Revise o e-mail informado e tente novamente.",
      fieldErrors: extracted.fieldErrors,
    };
  }

  const parsed = forgotPasswordFormSchema.safeParse(extracted.data);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o e-mail informado e tente novamente.",
      fieldErrors: parsed.error.flatten().fieldErrors as Pick<
        AuthFieldErrors,
        "email"
      >,
    };
  }

  try {
    const requestHeaders = await headers();
    const appOrigin = resolveAppOrigin(
      requestHeaders,
      process.env.NEXT_PUBLIC_SITE_URL,
    );

    if (!appOrigin) {
      return {
        status: "error",
        message:
          "Não foi possível processar o reenvio agora. Tente novamente em instantes.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: {
        emailRedirectTo: new URL(
          "/auth/callback",
          appOrigin,
        ).toString(),
      },
    });

    if (error && isRateLimitError(error)) {
      return {
        status: "error",
        message:
          "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
      };
    }

    return confirmationResentState();
  } catch {
    return confirmationResentState();
  }
}

export async function verifyRecoveryOtpAction(
  _previousState: OtpActionState,
  formData: FormData,
): Promise<OtpActionState> {
  const extracted = extractEmailOtpFormData(formData);

  if (!extracted.success) {
    return {
      status: "error",
      message: "Revise o código informado e tente novamente.",
      fieldErrors: extracted.fieldErrors,
    };
  }

  const parsed = emailOtpFormSchema.safeParse(extracted.data);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o código informado e tente novamente.",
      fieldErrors: parsed.error.flatten().fieldErrors as Pick<
        AuthFieldErrors,
        "email" | "token"
      >,
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "recovery",
    });

    if (error) {
      return otpErrorState(
        error,
        "Não foi possível validar o código agora. Solicite outro e tente novamente.",
      );
    }

    if (
      !data.user ||
      !data.session ||
      data.session.user.id !== data.user.id ||
      !(await hasExpectedCurrentUser(supabase, data.user.id))
    ) {
      await discardUntrustedSession(supabase);

      return {
        status: "error",
        message:
          "Não foi possível validar o código agora. Solicite outro e tente novamente.",
      };
    }

    const requestHeaders = await headers();
    const appOrigin = resolveAppOrigin(
      requestHeaders,
      process.env.NEXT_PUBLIC_SITE_URL,
    );

    if (!appOrigin) {
      await discardUntrustedSession(supabase);

      return {
        status: "error",
        message:
          "Não foi possível validar o código agora. Solicite outro e tente novamente.",
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(
      RECOVERY_SESSION_COOKIE,
      createRecoverySessionProof(data.session),
      {
        httpOnly: true,
        maxAge: RECOVERY_SESSION_MAX_AGE_SECONDS,
        path: "/reset-password",
        sameSite: "lax",
        secure: new URL(appOrigin).protocol === "https:",
      },
    );
  } catch {
    if (supabase) {
      await discardUntrustedSession(supabase);
    }

    return {
      status: "error",
      message:
        "Não foi possível validar o código agora. Solicite outro e tente novamente.",
    };
  }

  redirect("/reset-password");
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const values = formDataToObject(formData);
  const parsed = values
    ? forgotPasswordFormSchema.safeParse(values)
    : { success: false as const, error: undefined };

  if (!parsed.success) {
    return invalidFormState(parsed.error);
  }

  try {
    const requestHeaders = await headers();
    const appOrigin = resolveAppOrigin(
      requestHeaders,
      process.env.NEXT_PUBLIC_SITE_URL,
    );

    if (!appOrigin) {
      return {
        status: "error",
        message:
          "Não foi possível processar a solicitação agora. Tente novamente em instantes.",
      };
    }

    const callbackUrl = new URL("/auth/callback", appOrigin);
    callbackUrl.searchParams.set("next", "/reset-password");

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: callbackUrl.toString() },
    );

    if (error && isRateLimitError(error)) {
      return rateLimitState();
    }
  } catch {
    return recoveryEmailSentState();
  }

  return recoveryEmailSentState();
}

export async function resendRecoveryCodeAction(
  _previousState: RecoveryCodeResendActionState,
  formData: FormData,
): Promise<RecoveryCodeResendActionState> {
  const extracted = extractEmailFormData(formData);

  if (!extracted.success) {
    return {
      status: "error",
      message: "Revise o e-mail informado e tente novamente.",
      fieldErrors: extracted.fieldErrors,
    };
  }

  const parsed = forgotPasswordFormSchema.safeParse(extracted.data);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o e-mail informado e tente novamente.",
      fieldErrors: parsed.error.flatten().fieldErrors as Pick<
        AuthFieldErrors,
        "email"
      >,
    };
  }

  try {
    const requestHeaders = await headers();
    const appOrigin = resolveAppOrigin(
      requestHeaders,
      process.env.NEXT_PUBLIC_SITE_URL,
    );

    if (!appOrigin) {
      return {
        status: "error",
        message:
          "Não foi possível processar o reenvio agora. Tente novamente em instantes.",
      };
    }

    const callbackUrl = new URL("/auth/callback", appOrigin);
    callbackUrl.searchParams.set("next", "/reset-password");

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: callbackUrl.toString() },
    );

    if (error && isRateLimitError(error)) {
      return {
        status: "error",
        message:
          "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
      };
    }

    return recoveryCodeResentState();
  } catch {
    return recoveryCodeResentState();
  }
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const extracted = extractResetPasswordFormData(formData);

  if (!extracted.success) {
    return {
      status: "error",
      message: "Revise os campos indicados e tente novamente.",
      fieldErrors: extracted.fieldErrors,
    };
  }

  const parsed = resetPasswordFormSchema.safeParse(extracted.data);

  if (!parsed.success) {
    return invalidFormState(parsed.error);
  }

  try {
    const recoveryContext = await getRecoveryAuthContext();

    if (recoveryContext.status !== "valid") {
      return {
        status: "error",
        message:
          "Este link de recuperação não é mais válido. Solicite uma nova redefinição de senha.",
      };
    }

    const { error } = await recoveryContext.supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      if (getErrorCode(error) === "same_password") {
        const message =
          "A nova senha precisa ser diferente da senha atual.";

        return {
          status: "error",
          message,
          fieldErrors: { password: [message] },
        };
      }

      return isRateLimitError(error)
        ? rateLimitState()
        : {
            status: "error",
            message:
              "Não foi possível atualizar sua senha agora. Solicite um novo link ou tente novamente em instantes.",
          };
    }

    const { error: signOutError } =
      await recoveryContext.supabase.auth.signOut({ scope: "local" });

    if (signOutError) {
      return {
        status: "error",
        message:
          "Sua senha foi atualizada, mas não foi possível encerrar esta sessão. Acesse o painel e saia da conta antes de entrar novamente.",
      };
    }

    await clearRecoverySessionProof();
  } catch {
    return {
      status: "error",
      message:
        "Não foi possível atualizar sua senha agora. Solicite um novo link ou tente novamente em instantes.",
    };
  }

  redirect("/login?message=password-updated");
}

function logoutErrorState(): LogoutActionState {
  return {
    status: "error",
    message: "Não foi possível sair agora. Tente novamente em instantes.",
  };
}

export async function logoutAction(
  _previousState: LogoutActionState,
  _formData: FormData,
): Promise<LogoutActionState> {
  void _previousState;
  void _formData;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      return logoutErrorState();
    }
  } catch {
    return logoutErrorState();
  }

  redirect("/login");
}

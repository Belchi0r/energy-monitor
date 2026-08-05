"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { z } from "zod";

import { resolveAppOrigin } from "@/lib/auth/origin";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect";
import type {
  AuthActionState,
  AuthFieldErrors,
  LogoutActionState,
} from "@/lib/auth/state";
import {
  formDataToObject,
  loginFormSchema,
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
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;

  if (code === "invalid_credentials") {
    return "E-mail ou senha inválidos.";
  }

  if (code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (code === "over_request_rate_limit") {
    return "Muitas tentativas seguidas. Aguarde um momento e tente novamente.";
  }

  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

function signupSuccessState(): AuthActionState {
  return {
    status: "signup-success",
    message:
      "Cadastro recebido. Enviamos as instruções de confirmação, caso o endereço possa ser cadastrado.",
  };
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
      message: "Não foi possível entrar agora. Tente novamente em instantes.",
    };
  }

  redirect(resolveSafeRedirectPath(parsed.data.next));
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
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

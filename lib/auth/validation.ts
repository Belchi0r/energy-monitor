import { z } from "zod";

import { AUTH_EMAIL_OTP_LENGTH } from "@/lib/auth/otp";

const emailSchema = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .min(1, "Informe seu e-mail.")
  .email("Digite um e-mail válido.")
  .transform((email) => email.toLocaleLowerCase("en-US"));

const passwordSchema = z
  .string({ error: "Informe sua senha." })
  .min(1, "Informe sua senha.");

export const loginFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    next: z.string().optional(),
  })
  .strict();

export const signupFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema.min(
      8,
      "A senha deve ter pelo menos 8 caracteres.",
    ),
    confirmPassword: z.string({
      error: "Confirme sua senha.",
    }),
  })
  .strict()
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const forgotPasswordFormSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const emailOtpFormSchema = z
  .object({
    email: emailSchema,
    token: z
      .string({ error: "Informe o código de verificação." })
      .regex(
        new RegExp(`^\\d{${AUTH_EMAIL_OTP_LENGTH}}$`),
        `Digite exatamente ${AUTH_EMAIL_OTP_LENGTH} números.`,
      ),
  })
  .strict();

export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema.min(
      8,
      "A senha deve ter pelo menos 8 caracteres.",
    ),
    confirmPassword: z.string({
      error: "Confirme sua senha.",
    }),
  })
  .strict()
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type ResetPasswordField = "password" | "confirmPassword";
type EmailOtpField = "email" | "token";

type EmailFormDataResult =
  | {
      success: true;
      data: { email: string };
    }
  | {
      success: false;
      fieldErrors: { email: string[] };
    };

type ResetPasswordFormDataResult =
  | {
      success: true;
      data: Record<ResetPasswordField, string>;
    }
  | {
      success: false;
      fieldErrors: Partial<Record<ResetPasswordField, string[]>>;
    };

type EmailOtpFormDataResult =
  | {
      success: true;
      data: Record<EmailOtpField, string>;
    }
  | {
      success: false;
      fieldErrors: Partial<Record<EmailOtpField, string[]>>;
    };

const resetPasswordFieldMessages = {
  password: {
    missing: "Informe sua senha.",
    invalid: "Informe uma senha válida.",
    duplicate: "Envie apenas um valor para a nova senha.",
  },
  confirmPassword: {
    missing: "Confirme sua senha.",
    invalid: "Informe uma confirmação de senha válida.",
    duplicate: "Envie apenas um valor para a confirmação da senha.",
  },
} as const;

export function extractResetPasswordFormData(
  formData: FormData,
): ResetPasswordFormDataResult {
  const fields: ResetPasswordField[] = [
    "password",
    "confirmPassword",
  ];
  const data = {} as Record<ResetPasswordField, string>;
  const fieldErrors: Partial<
    Record<ResetPasswordField, string[]>
  > = {};

  fields.forEach((field) => {
    const values = formData.getAll(field);
    const messages = resetPasswordFieldMessages[field];

    if (values.length === 0) {
      fieldErrors[field] = [messages.missing];
      return;
    }

    if (values.length !== 1) {
      fieldErrors[field] = [messages.duplicate];
      return;
    }

    const [value] = values;

    if (typeof value !== "string") {
      fieldErrors[field] = [messages.invalid];
      return;
    }

    data[field] = value;
  });

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, data };
}

export function extractEmailFormData(
  formData: FormData,
): EmailFormDataResult {
  const values = formData.getAll("email");

  if (values.length === 0) {
    return {
      success: false,
      fieldErrors: { email: ["Informe seu e-mail."] },
    };
  }

  if (values.length !== 1) {
    return {
      success: false,
      fieldErrors: {
        email: ["Envie apenas um valor para o e-mail."],
      },
    };
  }

  const [email] = values;

  return typeof email === "string"
    ? { success: true, data: { email } }
    : {
        success: false,
        fieldErrors: { email: ["Informe um e-mail válido."] },
      };
}

const emailOtpFieldMessages = {
  email: {
    missing: "Informe seu e-mail.",
    invalid: "Informe um e-mail válido.",
    duplicate: "Envie apenas um valor para o e-mail.",
  },
  token: {
    missing: "Informe o código de verificação.",
    invalid: "Informe um código de verificação válido.",
    duplicate: "Envie apenas um valor para o código de verificação.",
  },
} as const;

export function extractEmailOtpFormData(
  formData: FormData,
): EmailOtpFormDataResult {
  const fields: EmailOtpField[] = ["email", "token"];
  const data = {} as Record<EmailOtpField, string>;
  const fieldErrors: Partial<Record<EmailOtpField, string[]>> = {};

  fields.forEach((field) => {
    const values = formData.getAll(field);
    const messages = emailOtpFieldMessages[field];

    if (values.length === 0) {
      fieldErrors[field] = [messages.missing];
      return;
    }

    if (values.length !== 1) {
      fieldErrors[field] = [messages.duplicate];
      return;
    }

    const [value] = values;

    if (typeof value !== "string") {
      fieldErrors[field] = [messages.invalid];
      return;
    }

    data[field] = value;
  });

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, data };
}

export function formDataToObject(formData: FormData) {
  const values: Record<string, FormDataEntryValue> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION_")) {
      continue;
    }

    if (Object.hasOwn(values, key)) {
      return null;
    }

    values[key] = value;
  }

  return values;
}

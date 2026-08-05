import { z } from "zod";

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

export function formDataToObject(formData: FormData) {
  const values: Record<string, FormDataEntryValue> = {};

  for (const [key, value] of formData.entries()) {
    if (Object.hasOwn(values, key)) {
      return null;
    }

    values[key] = value;
  }

  return values;
}

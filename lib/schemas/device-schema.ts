import { z } from "zod";

import {
  deviceCategories,
  deviceStatuses,
  type DeviceInput,
} from "@/lib/devices/types";
import {
  MAX_USAGE_WINDOWS,
  resolveUsageProfile,
  usageProfileTypes,
} from "@/lib/energy/usage-profiles";

export const usageWindowSchema = z
  .object({
    startHour: z
      .number({ error: "Informe a hora inicial como número." })
      .int("A hora inicial deve ser inteira.")
      .min(0, "A hora inicial deve ser a partir de 0h.")
      .max(23, "A hora inicial deve ser até 23h."),
    endHour: z
      .number({ error: "Informe a hora final como número." })
      .int("A hora final deve ser inteira.")
      .min(1, "A hora final deve ser a partir de 1h.")
      .max(24, "A hora final deve ser até 24h."),
    weight: z
      .number({ error: "Informe o peso como número." })
      .positive("O peso deve ser maior que zero.")
      .max(100, "O peso deve ser de até 100."),
  })
  .strict()
  .refine((window) => window.startHour < window.endHour, {
    path: ["endHour"],
    message: "A hora final deve ser posterior à hora inicial.",
  });

const rawDeviceInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe um nome com pelo menos 2 caracteres.")
      .max(80, "O nome deve ter no máximo 80 caracteres."),
    category: z.enum(deviceCategories, {
      error: "Selecione uma categoria válida.",
    }),
    powerWatts: z
      .number({
        error: "Informe a potência como número.",
      })
      .positive("A potência deve ser maior que zero.")
      .max(50_000, "A potência deve ser de até 50.000 W."),
    averageDailyHours: z
      .number({
        error: "Informe o uso médio como número.",
      })
      .positive("O uso médio deve ser maior que zero.")
      .max(24, "O uso médio deve ser de até 24 horas."),
    status: z.enum(deviceStatuses, {
      error: "Selecione um status válido.",
    }),
    usageProfileType: z
      .enum(usageProfileTypes, {
        error: "Selecione um perfil de uso válido.",
      })
      .optional(),
    usageWindows: z
      .array(usageWindowSchema, {
        error: "Informe janelas de uso válidas.",
      })
      .min(1, "Informe pelo menos uma janela de uso.")
      .max(
        MAX_USAGE_WINDOWS,
        `Use no máximo ${MAX_USAGE_WINDOWS} janelas de uso.`,
      )
      .optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.usageProfileType === "CUSTOM" &&
      !input.usageWindows
    ) {
      context.addIssue({
        code: "custom",
        path: ["usageWindows"],
        message:
          "Adicione pelo menos uma janela para o perfil personalizado.",
      });
    }
  });

export const deviceInputSchema = rawDeviceInputSchema.transform(
  (input): DeviceInput => {
    const profile = resolveUsageProfile({
      category: input.category,
      usageProfileType: input.usageProfileType,
      usageWindows: input.usageWindows,
    });

    return {
      ...input,
      usageProfileType: profile.type,
      usageWindows: profile.windows,
    };
  },
);

export const deviceIdSchema = z
  .string()
  .trim()
  .min(1, "O identificador do dispositivo é obrigatório.");

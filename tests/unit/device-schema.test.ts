import { describe, expect, it } from "vitest";

import { deviceInputSchema } from "@/lib/schemas/device-schema";

describe("deviceInputSchema", () => {
  it("aceita o contrato completo", () => {
    const result = deviceInputSchema.safeParse({
      name: "Televisor",
      category: "Eletrônicos",
      powerWatts: 180,
      averageDailyHours: 4,
      status: "active",
      usageProfileType: "CUSTOM",
      usageWindows: [
        { startHour: 8, endHour: 12, weight: 1 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("enriquece payload antigo com fallback seguro por categoria", () => {
    const result = deviceInputSchema.parse({
      name: "Televisor",
      category: "Eletrônicos",
      powerWatts: 180,
      averageDailyHours: 4,
      status: "active",
    });

    expect(result.usageProfileType).toBe("SPLIT");
    expect(result.usageWindows).toHaveLength(2);
  });

  it.each([
    [
      "janela invertida",
      {
        usageProfileType: "CUSTOM",
        usageWindows: [
          { startHour: 18, endHour: 8, weight: 1 },
        ],
      },
    ],
    [
      "peso inválido",
      {
        usageProfileType: "CUSTOM",
        usageWindows: [
          { startHour: 8, endHour: 12, weight: 0 },
        ],
      },
    ],
    [
      "janelas demais",
      {
        usageProfileType: "CUSTOM",
        usageWindows: Array.from({ length: 7 }, () => ({
          startHour: 8,
          endHour: 12,
          weight: 1,
        })),
      },
    ],
  ])("rejeita %s no perfil de uso", (_name, override) => {
    const result = deviceInputSchema.safeParse({
      name: "Televisor",
      category: "Eletrônicos",
      powerWatts: 180,
      averageDailyHours: 4,
      status: "active",
      ...override,
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["campo desconhecido", { unexpected: true }],
    ["potência textual", { powerWatts: "180" }],
    ["horas excessivas", { averageDailyHours: 25 }],
    ["categoria inválida", { category: "Inválida" }],
  ])("rejeita %s", (_name, override) => {
    const result = deviceInputSchema.safeParse({
      name: "Televisor",
      category: "Eletrônicos",
      powerWatts: 180,
      averageDailyHours: 4,
      status: "active",
      ...override,
    });

    expect(result.success).toBe(false);
  });
});

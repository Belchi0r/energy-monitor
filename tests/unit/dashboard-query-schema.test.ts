import { describe, expect, it } from "vitest";

import { dashboardQuerySchema } from "@/lib/schemas/dashboard-query-schema";

describe("dashboardQuerySchema", () => {
  it("aplica os valores padrão quando a consulta está vazia", () => {
    expect(dashboardQuerySchema.parse({})).toEqual({
      period: "today",
      compare: false,
      mode: "home",
    });
  });

  it.each(["today", "7d", "30d"] as const)(
    "aceita o período %s",
    (period) => {
      expect(dashboardQuerySchema.parse({ period })).toEqual({
        period,
        compare: false,
        mode: "home",
      });
    },
  );

  it.each([
    ["true", true],
    ["false", false],
  ] as const)("transforma compare=%s em %s", (input, expected) => {
    expect(dashboardQuerySchema.parse({ compare: input }).compare).toBe(
      expected,
    );
  });

  it.each([
    [undefined, "home"],
    ["home", "home"],
    ["demo", "demo"],
    ["valor-arbitrário", "home"],
  ] as const)("normaliza mode=%s para %s", (input, expected) => {
    expect(dashboardQuerySchema.parse({ mode: input }).mode).toBe(
      expected,
    );
  });

  it.each([
    ["período vazio", { period: "" }],
    ["período inválido", { period: "year" }],
    ["comparação inválida", { compare: "yes" }],
    ["período repetido", { period: ["today", "7d"] }],
    ["comparação repetida", { compare: ["true", "false"] }],
    ["modo repetido", { mode: ["home", "demo"] }],
  ])("rejeita %s", (_caseName, input) => {
    expect(dashboardQuerySchema.safeParse(input).success).toBe(false);
  });

  it("permanece strict e rejeita parâmetros desconhecidos", () => {
    const result = dashboardQuerySchema.safeParse({
      period: "today",
      unexpected: "value",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "unrecognized_keys" }),
        ]),
      );
    }
  });
});

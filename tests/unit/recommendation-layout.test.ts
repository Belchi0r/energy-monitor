import { describe, expect, it } from "vitest";

import { getRecommendationGridClassName } from "@/components/dashboard/EnergyRecommendations";

describe("layout das recomendações", () => {
  it("usa uma coluna larga e equilibrada para uma recomendação", () => {
    expect(getRecommendationGridClassName(1)).toContain("max-w-5xl");
    expect(getRecommendationGridClassName(1)).toContain("grid-cols-1");
  });

  it("usa duas colunas para duas recomendações", () => {
    expect(getRecommendationGridClassName(2)).toBe("md:grid-cols-2");
  });

  it("permite três colunas somente em telas amplas", () => {
    expect(getRecommendationGridClassName(3)).toContain(
      "xl:grid-cols-3",
    );
  });
});

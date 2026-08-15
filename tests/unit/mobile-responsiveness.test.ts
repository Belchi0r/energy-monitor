import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("responsividade mobile", () => {
  it("declara um viewport acessível sem bloquear o zoom manual", () => {
    const layout = source("app/layout.tsx");
    const globalStyles = source("app/globals.css");
    const viewportConfiguration = `${layout}\n${globalStyles}`;

    expect(layout).toContain("export const viewport: Viewport");
    expect(layout).toContain('width: "device-width"');
    expect(layout).toContain("initialScale: 1");
    expect(viewportConfiguration).not.toMatch(
      /user-scalable|userScalable|maximum-scale|maximumScale/i,
    );
  });

  it("mantém controles textuais com pelo menos 16px no mobile", () => {
    const globalStyles = source("app/globals.css");
    const mobileControlRules = globalStyles.match(
      /@media \(max-width: 767px\) \{[\s\S]*?font-size: 1rem;[\s\S]*?\n\}/,
    )?.[0];

    expect(globalStyles).toContain("@media (max-width: 767px)");
    expect(globalStyles).toContain(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]),',
    );
    expect(globalStyles).toMatch(/select,\s*textarea\s*{\s*font-size: 1rem;/);
    expect(mobileControlRules).toBeDefined();
    expect(mobileControlRules).not.toMatch(/transform/i);
  });

  it("permite rolagem vertical das telas auth com a viewport dinâmica", () => {
    const authFrame = source("components/auth/AuthFrame.tsx");

    expect(authFrame).toContain("min-h-dvh");
    expect(authFrame).toContain("overflow-x-clip");
    expect(authFrame).not.toContain("overflow-hidden");
  });

  it("mantém o cadastro e a confirmação por link tocáveis no mobile", () => {
    const signup = source("components/auth/SignupForm.tsx");
    const linkStep = signup.slice(
      signup.indexOf("function SignupEmailLinkStep"),
      signup.indexOf("type SignupActionFlowProps"),
    );

    expect(linkStep).not.toContain("OtpCodeField");
    expect(linkStep).not.toMatch(/Digite o código|Verificar código/);
    expect(linkStep.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(linkStep).toContain("flex flex-wrap justify-center gap-3");
    expect(signup).toContain("min-h-12 w-full");
  });

  it("reorganiza o cabeçalho público sem esconder ou duplicar o selo", () => {
    const demoPage = source("app/demo/page.tsx");

    expect(demoPage).toContain("flex-col items-stretch");
    expect(demoPage).toContain("min-[390px]:flex-row");
    expect(demoPage).toContain("sm:flex-row");
    expect(demoPage.match(/Dados simulados/g)).toHaveLength(1);
    expect(demoPage).not.toContain("min-[390px]:hidden");
    expect(demoPage).not.toContain("min-[390px]:inline-flex");
    expect(demoPage).toContain("min-h-11");
  });

  it("mantém o novo histórico e seus controles adaptáveis em telas estreitas", () => {
    const dashboardHeader = source(
      "components/dashboard/DashboardPeriodHeader.tsx",
    );
    const comparisonControl = source(
      "components/dashboard/PeriodComparisonControl.tsx",
    );
    const historyNavigation = source(
      "components/dashboard/HistoryPeriodNav.tsx",
    );

    expect(dashboardHeader).toContain(
      "flex min-w-0 items-start gap-3",
    );
    expect(dashboardHeader).toContain("sm:max-w-md");
    expect(dashboardHeader).toContain(
      "flex flex-col gap-2 xl:flex-row",
    );
    expect(comparisonControl).toContain("min-h-11");
    expect(comparisonControl).toContain("min-w-0");
    expect(historyNavigation).toContain(
      "flex min-w-0 flex-col gap-3 xl:flex-row",
    );
  });
});

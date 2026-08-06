import { readFile } from "node:fs/promises";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import { AlertPanel } from "@/components/dashboard/AlertPanel";
import { getDashboardHeaderDescription } from "@/components/dashboard/DashboardPeriodHeader";
import {
  HistoryActivityView,
  type HistoryActivityViewProps,
} from "@/components/dashboard/HistoryActivityView";
import {
  RecentActivityTable,
  type RecentActivityTableProps,
} from "@/components/dashboard/RecentActivityTable";
import { Timeline } from "@/components/dashboard/Timeline";
import type { RecentActivity } from "@/lib/dashboard/types";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

const activity: RecentActivity = {
  id: "activity-1",
  device: "Luminária da sala",
  event: "Equipamento ligado",
  occurredAt: "10:30",
  occurredAtIso: "2026-08-05T13:30:00.000Z",
  status: "active",
};

const activityTableProps = {
  activities: [activity],
  activityTimeLabel: "Horário",
  period: "today",
  periodLabel: "Hoje",
} as const;

describe("textos e origem dos estados da dashboard", () => {
  it("não afirma que existe análise no cabeçalho sem dispositivos", () => {
    const description = getDashboardHeaderDescription(
      {
        mode: "home",
        period: "today",
        emptyState: {
          kind: "no-devices",
          title: "Estado vazio",
          description: "Estado vazio",
        },
      },
      "0,0 kWh",
    );

    expect(description).toContain("ainda não cadastrou dispositivos");
    expect(description).not.toContain("possui consumo estimado");
    expect(description).not.toContain("A análise abaixo");
  });

  it("pede cadastro de dispositivos no alerta residencial vazio", () => {
    const markup = renderToStaticMarkup(
      createElement(AlertPanel, {
        alerts: [],
        dataOrigin: "user-devices",
      }),
    );

    expect(markup).toContain(
      "Cadastre dispositivos para que o Energy Monitor possa calcular alertas e recomendações.",
    );
    expect(markup).not.toContain("Nenhuma regra de atenção foi acionada");
  });

  it("mantém o estado vazio da timeline coerente com a origem", () => {
    const timeline = { periodLabel: "Hoje", items: [] } as const;
    const homeMarkup = renderToStaticMarkup(
      createElement(Timeline, {
        timeline,
        dataOrigin: "user-devices",
      }),
    );
    const demoMarkup = renderToStaticMarkup(
      createElement(Timeline, {
        timeline,
        dataOrigin: "global-demo",
      }),
    );

    expect(homeMarkup).toContain(
      "Nenhum evento da sua residência está disponível para este período.",
    );
    expect(demoMarkup).toContain(
      "Nenhum evento demonstrativo está disponível para este período.",
    );
    expect(demoMarkup).not.toContain("Nenhum evento da sua residência");
    expect(demoMarkup).toContain("Eventos demonstrativos serão exibidos");
  });

  it("exige dataOrigin no contrato de RecentActivityTable", () => {
    expectTypeOf<RecentActivityTableProps>().toMatchTypeOf<{
      dataOrigin: DashboardViewData["dataOrigin"];
    }>();
  });

  it("remove indicações simuladas dos textos acessíveis residenciais", () => {
    const markup = renderToStaticMarkup(
      createElement(RecentActivityTable, {
        ...activityTableProps,
        dataOrigin: "user-devices",
      }),
    );

    expect(markup).toContain(
      'aria-label="Atividades recentes da residência"',
    );
    expect(markup).toContain("Atividades recentes dos dispositivos");
    expect(markup).toContain("Horário: ");
    expect(markup).not.toMatch(/simulad/i);
  });

  it("mantém indicação explícita nos textos demonstrativos", () => {
    const markup = renderToStaticMarkup(
      createElement(RecentActivityTable, {
        ...activityTableProps,
        dataOrigin: "global-demo",
      }),
    );

    expect(markup).toContain(
      'aria-label="Atividades simuladas recentes"',
    );
    expect(markup).toContain(
      "Atividades recentes simuladas dos dispositivos",
    );
    expect(markup).toContain("Horário simulado: ");
  });

  it("HistoryActivityView propaga dataOrigin para a tabela", () => {
    expectTypeOf<HistoryActivityViewProps>().toMatchTypeOf<{
      dataOrigin: DashboardViewData["dataOrigin"];
    }>();
    const markup = renderToStaticMarkup(
      createElement(HistoryActivityView, {
        ...activityTableProps,
        dataOrigin: "user-devices",
      }),
    );

    expect(markup).toContain(
      'aria-label="Atividades recentes da residência"',
    );
  });

  it("faz a página de histórico usar explicitamente o modo validado", async () => {
    const source = await readFile(
      new URL("../../app/history/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("parseHistorySearchParams");
    expect(source).toContain("mode: routeState.mode");
    expect(source).not.toContain('mode: "demo"');
    expect(source).toContain("dataOrigin={view.dataOrigin}");
  });
});

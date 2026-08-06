"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { AlertCard } from "@/components/dashboard/AlertCard";
import { Panel } from "@/components/ui/Panel";
import type {
  AlertSeverity,
  DashboardAlert,
} from "@/lib/dashboard/alert-types";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type AlertFilter = "all" | AlertSeverity;
type AlertLocalState = "open" | "resolved" | "dismissed";

const alertFilters = [
  { value: "all", label: "Todos" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
  { value: "info", label: "Informativa" },
] as const satisfies readonly {
  value: AlertFilter;
  label: string;
}[];

type AlertsViewProps = {
  alerts: readonly DashboardAlert[];
  dataOrigin: DashboardViewData["dataOrigin"];
};

export function AlertsView({ alerts, dataOrigin }: AlertsViewProps) {
  const isDemo = dataOrigin === "global-demo";
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [alertStates, setAlertStates] = useState<
    Record<string, AlertLocalState>
  >(() =>
    Object.fromEntries(
      alerts.map((alert) => [alert.id, "open" as const]),
    ),
  );
  const [feedback, setFeedback] = useState("");
  const visibleAlerts = alerts.filter(
    (alert) => alertStates[alert.id] !== "dismissed",
  );
  const filteredAlerts =
    filter === "all"
      ? visibleAlerts
      : visibleAlerts.filter((alert) => alert.severity === filter);
  const resolvedCount = visibleAlerts.filter(
    (alert) => alertStates[alert.id] === "resolved",
  ).length;

  function resolveAlert(alert: DashboardAlert) {
    setAlertStates((current) => ({
      ...current,
      [alert.id]: "resolved",
    }));
    setFeedback(`${alert.title} foi marcado como resolvido nesta sessão.`);
  }

  function dismissAlert(alert: DashboardAlert) {
    setAlertStates((current) => ({
      ...current,
      [alert.id]: "dismissed",
    }));
    setFeedback(`${alert.title} foi dispensado nesta sessão.`);
  }

  return (
    <Panel
      title="Alertas inteligentes"
      description={
        isDemo
          ? "Ações e estados permanecem somente nesta sessão demonstrativa"
          : "Estimativas calculadas com os dispositivos vinculados à sua conta"
      }
      className="min-w-0"
    >
      <div
        role="group"
        aria-label="Filtrar alertas por prioridade"
        className="flex flex-wrap gap-2"
      >
        {alertFilters.map((option) => {
          const count =
            option.value === "all"
              ? visibleAlerts.length
              : visibleAlerts.filter(
                  (alert) => alert.severity === option.value,
                ).length;
          const isActive = filter === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              disabled={count === 0}
              onClick={() => setFilter(option.value)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none ${
                isActive
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
              }`}
            >
              {option.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                  isActive ? "bg-white/15" : "bg-slate-100"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {feedback || `${filteredAlerts.length} alertas exibidos.`}
      </p>

      {resolvedCount > 0 ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-900">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            {resolvedCount}{" "}
            {resolvedCount === 1
              ? "alerta foi resolvido"
              : "alertas foram resolvidos"}{" "}
            localmente nesta sessão.
          </p>
        </div>
      ) : null}

      {filteredAlerts.length > 0 ? (
        <ul
          aria-label={
            isDemo
              ? "Alertas demonstrativos filtrados"
              : "Alertas residenciais filtrados"
          }
          className="mt-5 space-y-3"
        >
          {filteredAlerts.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              index={index}
              state={
                alertStates[alert.id] === "resolved"
                  ? "resolved"
                  : "open"
              }
              onResolve={resolveAlert}
              onDismiss={dismissAlert}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 text-sm leading-6 text-slate-600">
          {isDemo
            ? "Nenhum alerta demonstrativo está disponível neste filtro. Alertas dispensados voltam a aparecer ao recarregar a página."
            : "Nenhum alerta residencial está disponível neste filtro. Alertas dispensados voltam a aparecer ao recarregar a página."}
        </p>
      )}
    </Panel>
  );
}

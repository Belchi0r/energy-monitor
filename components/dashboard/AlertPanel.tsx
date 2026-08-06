import { AlertCard } from "@/components/dashboard/AlertCard";
import type { DashboardAlert } from "@/lib/dashboard/alert-types";
import { Panel } from "@/components/ui/Panel";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type AlertPanelProps = {
  alerts: readonly DashboardAlert[];
  dataOrigin: DashboardViewData["dataOrigin"];
};

export function AlertPanel({ alerts, dataOrigin }: AlertPanelProps) {
  const isDemo = dataOrigin === "global-demo";
  const alertCountLabel =
    alerts.length === 1
      ? "1 alerta calculado"
      : `${alerts.length} alertas calculados`;
  const originLabel = !isDemo
    ? "estimativas dos dispositivos cadastrados"
    : "dados históricos simulados";
  const description =
    alerts.length > 0
      ? `${alertCountLabel} a partir de ${originLabel}`
      : isDemo
        ? "Nenhum alerta calculado no cenário demonstrativo"
        : "Alertas e recomendações serão gerados após o cadastro de dispositivos";

  return (
    <Panel
      title="Alertas inteligentes"
      description={description}
      className="min-w-0"
    >
      {alerts.length > 0 ? (
        <ul
          aria-label="Alertas calculados por prioridade"
          className={alerts.length === 1 ? "space-y-0" : "space-y-2.5"}
        >
          {alerts.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              index={index}
              compact
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm leading-6 text-slate-600">
          {isDemo
            ? "Nenhuma regra de atenção foi acionada no cenário demonstrativo."
            : "Cadastre dispositivos para que o Energy Monitor possa calcular alertas e recomendações."}
        </p>
      )}
    </Panel>
  );
}

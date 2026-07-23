import { AlertCard } from "@/components/dashboard/AlertCard";
import type { DashboardAlert } from "@/lib/dashboard/alert-types";
import { Panel } from "@/components/ui/Panel";

type AlertPanelProps = {
  alerts: readonly DashboardAlert[];
};

export function AlertPanel({ alerts }: AlertPanelProps) {
  const alertCountLabel =
    alerts.length === 1
      ? "1 alerta calculado"
      : `${alerts.length} alertas calculados`;

  return (
    <Panel
      title="Alertas inteligentes"
      description={`${alertCountLabel} a partir dos dados simulados`}
      className="min-w-0"
    >
      {alerts.length > 0 ? (
        <ul
          aria-label="Alertas calculados por prioridade"
          className="space-y-3"
        >
          {alerts.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm leading-6 text-slate-600">
          Nenhuma regra de atenção foi acionada pelos valores deste período.
        </p>
      )}
    </Panel>
  );
}

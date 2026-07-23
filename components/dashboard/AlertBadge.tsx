import type { AlertSeverity } from "@/components/types/dashboard-alerts";

const severityConfig: Record<
  AlertSeverity,
  { label: string; className: string }
> = {
  info: {
    label: "Informativa",
    className: "bg-blue-50 text-blue-800 ring-blue-600/15",
  },
  low: {
    label: "Baixa",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  },
  medium: {
    label: "Média",
    className: "bg-amber-50 text-amber-800 ring-amber-600/15",
  },
  high: {
    label: "Alta",
    className: "bg-rose-50 text-rose-800 ring-rose-600/15",
  },
};

type AlertBadgeProps = {
  severity: AlertSeverity;
};

export function AlertBadge({ severity }: AlertBadgeProps) {
  const config = severityConfig[severity];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}
    >
      Prioridade {config.label.toLocaleLowerCase("pt-BR")}
    </span>
  );
}

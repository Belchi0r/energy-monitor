import {
  CircleCheck,
  CircleDot,
  Clock3,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type {
  ActivityStatus,
  DashboardPeriod,
  RecentActivity,
} from "@/lib/dashboard/types";
import { formatDashboardEventTimestamp } from "@/lib/dashboard/formatters";
import { Panel } from "@/components/ui/Panel";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

const statusConfig: Record<
  ActivityStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  active: {
    label: "Ativo",
    icon: CircleDot,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
  completed: {
    label: "Concluído",
    icon: CircleCheck,
    className: "bg-slate-100 text-slate-700 ring-slate-600/10",
  },
  attention: {
    label: "Atenção",
    icon: TriangleAlert,
    className: "bg-amber-50 text-amber-800 ring-amber-600/15",
  },
};

export type RecentActivityTableProps = {
  activities: readonly RecentActivity[];
  activityTimeLabel: string;
  period: DashboardPeriod;
  periodLabel: string;
  dataOrigin: DashboardViewData["dataOrigin"];
};

function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {config.label}
    </span>
  );
}

export function RecentActivityTable({
  activities,
  activityTimeLabel,
  period,
  periodLabel,
  dataOrigin,
}: RecentActivityTableProps) {
  const isDemo = dataOrigin === "global-demo";
  const formattedActivities = activities.map((activity) => ({
    ...activity,
    displayedOccurredAt: formatDashboardEventTimestamp(
      activity.occurredAtIso,
      period,
    ).tableLabel,
  }));

  return (
    <Panel
      title="Atividade recente"
      description={
        isDemo
          ? `Até cinco eventos simulados em ${periodLabel.toLocaleLowerCase("pt-BR")}`
          : `Eventos da sua residência em ${periodLabel.toLocaleLowerCase("pt-BR")}`
      }
    >
      {formattedActivities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Nenhuma atividade encontrada
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isDemo
              ? "Nenhum registro demonstrativo está disponível neste período."
              : "As atividades aparecerão quando houver medições disponíveis."}
          </p>
        </div>
      ) : (
        <>
          <ul
            className="space-y-2.5 md:hidden"
            aria-label={
              isDemo
                ? "Atividades simuladas recentes"
                : "Atividades recentes da residência"
            }
          >
            {formattedActivities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    {activity.device}
                  </p>
                  <ActivityStatusBadge status={activity.status} />
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {activity.event}
                </p>
                <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium tabular-nums text-slate-500">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {activityTimeLabel}{isDemo ? " simulado" : ""}:{" "}
                  {activity.displayedOccurredAt}
                </p>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 md:block">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">
                {isDemo
                  ? "Atividades recentes simuladas dos dispositivos"
                  : "Atividades recentes dos dispositivos"}
              </caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="w-1/4 px-4 py-3">
                    Dispositivo
                  </th>
                  <th scope="col" className="w-2/5 px-4 py-3">
                    Evento
                  </th>
                  <th scope="col" className="w-[15%] px-4 py-3">
                    {activityTimeLabel}
                  </th>
                  <th scope="col" className="w-1/5 px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {formattedActivities.map((activity) => (
                  <tr
                    key={activity.id}
                    className="transition-colors duration-150 hover:bg-slate-50 motion-reduce:transition-none"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 text-sm font-semibold text-slate-900 [hyphens:none]"
                    >
                      {activity.device}
                    </th>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {activity.event}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums text-slate-600">
                      {activity.displayedOccurredAt}
                    </td>
                    <td className="px-4 py-3">
                      <ActivityStatusBadge status={activity.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

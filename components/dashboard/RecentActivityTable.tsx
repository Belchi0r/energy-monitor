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

type RecentActivityTableProps = {
  activities: readonly RecentActivity[];
  activityTimeLabel: string;
  period: DashboardPeriod;
  periodLabel: string;
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
}: RecentActivityTableProps) {
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
      description={`Até cinco eventos simulados em ${periodLabel.toLocaleLowerCase("pt-BR")}`}
    >
      <ul className="space-y-3 md:hidden" aria-label="Atividades simuladas recentes">
        {formattedActivities.map((activity) => (
          <li
            key={activity.id}
            className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-900">{activity.device}</p>
              <ActivityStatusBadge status={activity.status} />
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              {activity.event}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium tabular-nums text-slate-500">
              <Clock3 aria-hidden="true" className="size-3.5" />
              {activityTimeLabel} simulado: {activity.displayedOccurredAt}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">
            Atividades recentes simuladas dos dispositivos
          </caption>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="w-1/4 px-5 py-3.5">
                Dispositivo
              </th>
              <th scope="col" className="w-2/5 px-5 py-3.5">
                Evento
              </th>
              <th scope="col" className="w-[15%] px-5 py-3.5">
                {activityTimeLabel}
              </th>
              <th scope="col" className="w-1/5 px-5 py-3.5">
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
                  className="px-5 py-4 text-sm font-semibold text-slate-900 [hyphens:none]"
                >
                  {activity.device}
                </th>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {activity.event}
                </td>
                <td className="px-5 py-4 text-sm font-medium tabular-nums text-slate-600">
                  {activity.displayedOccurredAt}
                </td>
                <td className="px-5 py-4">
                  <ActivityStatusBadge status={activity.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

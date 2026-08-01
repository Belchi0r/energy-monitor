"use client";

import { Filter } from "lucide-react";
import { useState } from "react";

import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import type {
  DashboardPeriod,
  RecentActivity,
} from "@/lib/dashboard/types";

type HistoryActivityViewProps = {
  activities: readonly RecentActivity[];
  activityTimeLabel: string;
  period: DashboardPeriod;
  periodLabel: string;
};

export function HistoryActivityView({
  activities,
  activityTimeLabel,
  period,
  periodLabel,
}: HistoryActivityViewProps) {
  const [device, setDevice] = useState("all");
  const devices = Array.from(
    new Set(activities.map((activity) => activity.device)),
  ).toSorted((first, second) => first.localeCompare(second, "pt-BR"));
  const filteredActivities =
    device === "all"
      ? activities
      : activities.filter((activity) => activity.device === device);

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Filter aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Filtrar registros
            </p>
            <p className="text-xs text-slate-500">
              A lista abaixo é demonstrativa.
            </p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="history-device-filter" className="sr-only">
            Filtrar histórico por dispositivo
          </label>
          <select
            id="history-device-filter"
            value={device}
            onChange={(event) => setDevice(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            <option value="all">Todos os dispositivos</option>
            {devices.map((deviceName) => (
              <option key={deviceName} value={deviceName}>
                {deviceName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <RecentActivityTable
        activities={filteredActivities}
        activityTimeLabel={activityTimeLabel}
        period={period}
        periodLabel={periodLabel}
      />
    </div>
  );
}

import {
  CircleDot,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";

import {
  formatEnergy,
  formatRatioPercentage,
} from "@/lib/dashboard/formatters";
import type { DeviceView } from "@/lib/devices/types";
import { formatDeviceDisplayName } from "@/lib/energy/advisor/energy-advisor.utils";

const integerFormatter = new Intl.NumberFormat("pt-BR");
const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

type DeviceSummaryCardProps = {
  device: DeviceView;
  totalConsumptionKwh: number;
  index: number;
  onEdit: (device: DeviceView) => void;
  onDelete: (device: DeviceView) => void;
};

export function DeviceSummaryCard({
  device,
  totalConsumptionKwh,
  index,
  onEdit,
  onDelete,
}: DeviceSummaryCardProps) {
  const participation =
    totalConsumptionKwh === 0
      ? 0
      : device.estimatedDailyConsumptionKwh / totalConsumptionKwh;
  const isActive = device.status === "active";

  return (
    <article
      className="dashboard-card-enter flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-panel)]"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            {device.category}
          </p>
          <h2 className="mt-1 break-words text-lg font-semibold tracking-tight text-slate-950">
            {formatDeviceDisplayName(device.name)}
          </h2>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
            isActive
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
              : "bg-slate-100 text-slate-600 ring-slate-600/10"
          }`}
        >
          {isActive ? (
            <CircleDot aria-hidden="true" className="size-3.5" />
          ) : (
            <Power aria-hidden="true" className="size-3.5" />
          )}
          {isActive ? "Ativo" : "Inativo"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-5 text-slate-500">
        {device.description}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs font-medium text-slate-500">
            Potência estimada
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
            {integerFormatter.format(device.powerWatts)} W
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs font-medium text-slate-500">
            Uso médio
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
            {decimalFormatter.format(device.averageDailyHours)} h/dia
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Consumo estimado
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-slate-950">
              {formatEnergy(device.estimatedDailyConsumptionKwh)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">
              Participação
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
              {formatRatioPercentage(participation)}
            </p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        >
          <span
            className="block h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(participation * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={() => onEdit(device)}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 motion-reduce:transition-none"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(device)}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-50 motion-reduce:transition-none"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Excluir
        </button>
      </div>
    </article>
  );
}

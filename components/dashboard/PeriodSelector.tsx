import type { DashboardPeriod } from "@/lib/dashboard/types";
import { dashboardPeriodDefinitions } from "@/components/utils/dashboard-period";

type PeriodSelectorProps = {
  period: DashboardPeriod;
  disabled: boolean;
  onChange: (period: DashboardPeriod) => void;
};

export function PeriodSelector({
  period,
  disabled,
  onChange,
}: PeriodSelectorProps) {
  return (
    <fieldset className="min-w-0 sm:min-w-80">
      <legend className="sr-only">Período da análise</legend>
      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
        {Object.values(dashboardPeriodDefinitions).map((option) => (
          <label
            key={option.period}
            className="relative min-w-0 cursor-pointer"
          >
            <input
              type="radio"
              name="dashboard-period"
              value={option.period}
              checked={period === option.period}
              disabled={disabled}
              onChange={() => onChange(option.period)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-semibold text-slate-500 transition-[background-color,color,box-shadow] duration-200 peer-checked:bg-white peer-checked:text-slate-950 peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600 peer-disabled:cursor-wait peer-disabled:opacity-60 motion-reduce:transition-none">
              {option.shortLabel}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

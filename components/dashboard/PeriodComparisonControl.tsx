type PeriodComparisonControlProps = {
  checked: boolean;
  comparisonLabel: string;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

export function PeriodComparisonControl({
  checked,
  comparisonLabel,
  disabled,
  onChange,
}: PeriodComparisonControlProps) {
  return (
    <label className="flex min-h-11 min-w-0 cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 motion-reduce:transition-none sm:min-w-60">
      <span className="min-w-0">
        Comparar com{" "}
        <span className="font-semibold text-slate-900">{comparisonLabel}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-emerald-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600 peer-disabled:cursor-wait peer-disabled:opacity-60 motion-reduce:transition-none" />
        <span className="pointer-events-none absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 motion-reduce:transition-none" />
      </span>
    </label>
  );
}

type PeriodComparisonControlProps = {
  checked: boolean;
  comparisonLabel: string;
  disabled: boolean;
  unavailable?: boolean;
  onChange: (checked: boolean) => void;
};

export function PeriodComparisonControl({
  checked,
  comparisonLabel,
  disabled,
  unavailable = false,
  onChange,
}: PeriodComparisonControlProps) {
  return (
    <label className={`flex min-h-11 min-w-0 items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 motion-reduce:transition-none sm:min-w-60 ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-slate-100"}`}>
      <span className="min-w-0">
        {unavailable ? (
          <span className="block">
            Comparação <span className="font-semibold text-slate-900">indisponível</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              Sem medições reais anteriores
            </span>
          </span>
        ) : (
          <>
            Comparar com{" "}
            <span className="font-semibold text-slate-900">{comparisonLabel}</span>
          </>
        )}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-emerald-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 motion-reduce:transition-none" />
        <span className="pointer-events-none absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 motion-reduce:transition-none" />
      </span>
    </label>
  );
}

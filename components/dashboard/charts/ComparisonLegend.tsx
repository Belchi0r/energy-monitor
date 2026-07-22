type ComparisonLegendProps = {
  currentLabel: string;
  previousLabel?: string;
};

export function ComparisonLegend({
  currentLabel,
  previousLabel,
}: ComparisonLegendProps) {
  return (
    <ul
      aria-label="Séries do gráfico"
      className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-400"
    >
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-px w-5 rounded-full bg-emerald-600/70"
        />
        {currentLabel}
      </li>
      {previousLabel ? (
        <li className="flex items-center gap-2">
          <svg
            aria-hidden="true"
            width="20"
            height="2"
            viewBox="0 0 20 2"
          >
            <path
              d="M0 1h20"
              stroke="var(--chart-5)"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
          </svg>
          {previousLabel}
        </li>
      ) : null}
    </ul>
  );
}

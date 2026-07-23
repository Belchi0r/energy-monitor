import type {
  ChartInsight,
  InsightTone,
} from "@/lib/dashboard/analytics";

const toneStyles: Record<InsightTone, string> = {
  brand: "border-emerald-200/80 bg-emerald-50/50 text-emerald-950",
  attention: "border-amber-200/80 bg-amber-50/50 text-amber-950",
  neutral: "border-slate-200/80 bg-slate-50/70 text-slate-800",
};

type ChartInsightsProps = {
  insights: readonly ChartInsight[];
  label: string;
};

export function ChartInsights({ insights, label }: ChartInsightsProps) {
  const [primaryInsight, ...secondaryInsights] = insights;

  if (!primaryInsight) {
    return null;
  }

  return (
    <section aria-label={label} className="space-y-2">
      <article
        className={`rounded-xl border p-3 ${toneStyles[primaryInsight.tone]}`}
      >
        <p className="text-sm font-semibold leading-5">
          {primaryInsight.title}
        </p>
        <p className="mt-0.5 text-xs leading-4 opacity-80">
          {primaryInsight.description}
        </p>
      </article>

      {secondaryInsights.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {secondaryInsights.map((insight) => (
            <li
              key={insight.id}
              className={`rounded-xl border p-3 ${toneStyles[insight.tone]}`}
            >
              <p className="text-xs font-semibold leading-4">{insight.title}</p>
              <p className="mt-0.5 text-xs leading-4 opacity-75">
                {insight.description}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

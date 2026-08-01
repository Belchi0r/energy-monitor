import type {
  ChartInsight,
  InsightTone,
} from "@/lib/dashboard/analytics";

const toneStyles: Record<InsightTone, string> = {
  brand: "border-emerald-400 bg-emerald-50/55 text-emerald-950",
  attention: "border-amber-400 bg-amber-50/55 text-amber-950",
  neutral: "border-slate-300 bg-slate-50/70 text-slate-800",
};

type ChartInsightsProps = {
  insights: readonly ChartInsight[];
  label: string;
};

export function ChartInsights({ insights, label }: ChartInsightsProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section aria-label={label}>
      <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={`min-w-0 rounded-lg border-l-2 px-3 py-2 ${toneStyles[insight.tone]}`}
          >
            <p className="text-xs font-semibold leading-4">
              {insight.title}
            </p>
            <p className="mt-0.5 text-[0.7rem] leading-4 opacity-75">
              {insight.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

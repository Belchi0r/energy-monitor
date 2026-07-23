import { CalendarDays } from "lucide-react";

import { TimelineItem } from "@/components/dashboard/TimelineItem";
import { Panel } from "@/components/ui/Panel";
import type { DashboardTimeline } from "@/lib/dashboard/timeline";

type TimelineProps = {
  timeline: DashboardTimeline;
};

export function Timeline({ timeline }: TimelineProps) {
  return (
    <Panel
      title="Linha do tempo"
      description="Eventos simulados organizados do mais recente ao mais antigo"
      className="min-w-0"
    >
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
        <CalendarDays
          aria-hidden="true"
          className="size-4 text-emerald-700"
        />
        {timeline.periodLabel}
      </div>

      <ol
        aria-label={`Eventos simulados em ${timeline.periodLabel}`}
        className="mt-5 min-w-0"
      >
        {timeline.items.map((item, index) => (
          <TimelineItem
            key={item.id}
            item={item}
            index={index}
            isLast={index === timeline.items.length - 1}
          />
        ))}
      </ol>

      <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
        Mostrando os eventos mais recentes.
      </p>
    </Panel>
  );
}

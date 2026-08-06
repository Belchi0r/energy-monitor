import { CalendarDays } from "lucide-react";

import { TimelineItem } from "@/components/dashboard/TimelineItem";
import { Panel } from "@/components/ui/Panel";
import type { DashboardTimeline } from "@/lib/dashboard/timeline";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type TimelineProps = {
  timeline: DashboardTimeline;
  dataOrigin: DashboardViewData["dataOrigin"];
};

export function Timeline({ timeline, dataOrigin }: TimelineProps) {
  const isDemo = dataOrigin === "global-demo";

  return (
    <Panel
      title="Linha do tempo"
      description={
        isDemo
          ? "Eventos simulados organizados do mais recente ao mais antigo"
          : "Eventos pertencentes à sua residência"
      }
      className="min-w-0"
    >
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
        <CalendarDays
          aria-hidden="true"
          className="size-4 text-emerald-700"
        />
        {timeline.periodLabel}
      </div>

      {timeline.items.length > 0 ? (
        <ol
          aria-label={`${isDemo ? "Eventos simulados" : "Eventos"} em ${timeline.periodLabel}`}
          className="mt-3 min-w-0"
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
      ) : (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600"
        >
          {isDemo
            ? "Nenhum evento demonstrativo está disponível para este período."
            : "Nenhum evento da sua residência está disponível para este período."}
        </p>
      )}

      <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        {isDemo
          ? "Eventos demonstrativos serão exibidos quando estiverem disponíveis."
          : "Eventos da residência serão exibidos quando houver medições disponíveis."}
      </p>
    </Panel>
  );
}

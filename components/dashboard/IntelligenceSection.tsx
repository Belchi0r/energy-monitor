import { AlertPanel } from "@/components/dashboard/AlertPanel";
import { Timeline } from "@/components/dashboard/Timeline";
import type { DashboardAlert } from "@/lib/dashboard/alert-types";
import type { DashboardTimeline } from "@/lib/dashboard/timeline";
import type { DashboardViewData } from "@/lib/services/dashboard-service";

type IntelligenceSectionProps = {
  alerts: readonly DashboardAlert[];
  timeline: DashboardTimeline;
  dataOrigin: DashboardViewData["dataOrigin"];
};

export function IntelligenceSection({
  alerts,
  timeline,
  dataOrigin,
}: IntelligenceSectionProps) {
  return (
    <section
      aria-label="Alertas e eventos interpretados"
      className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2"
    >
      <AlertPanel alerts={alerts} dataOrigin={dataOrigin} />
      <Timeline timeline={timeline} dataOrigin={dataOrigin} />
    </section>
  );
}

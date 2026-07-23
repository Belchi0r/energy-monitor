import { AlertPanel } from "@/components/dashboard/AlertPanel";
import { Timeline } from "@/components/dashboard/Timeline";
import type { DashboardAlert } from "@/lib/dashboard/alert-types";
import type { DashboardTimeline } from "@/lib/dashboard/timeline";

type IntelligenceSectionProps = {
  alerts: readonly DashboardAlert[];
  timeline: DashboardTimeline;
};

export function IntelligenceSection({
  alerts,
  timeline,
}: IntelligenceSectionProps) {
  return (
    <section
      aria-label="Alertas e eventos interpretados"
      className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2"
    >
      <AlertPanel alerts={alerts} />
      <Timeline timeline={timeline} />
    </section>
  );
}

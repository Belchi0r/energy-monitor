import type {
  ActivityStatus,
  DashboardPeriod,
  RecentActivity,
} from "@/lib/dashboard/types";
import { formatDashboardEventTimestamp } from "@/lib/dashboard/formatters";

const MAX_TIMELINE_EVENTS = 8;

export type DashboardTimelineItem = {
  id: string;
  device: string;
  event: string;
  occurredAtIso: string;
  timeLabel: string;
  fullTimeLabel: string;
  status: ActivityStatus;
};

export type DashboardTimeline = {
  periodLabel: string;
  items: readonly DashboardTimelineItem[];
};

export function buildDashboardTimeline(
  activities: readonly RecentActivity[],
  period: DashboardPeriod,
  periodLabel: string,
): DashboardTimeline {
  const items = [...activities]
    .sort(
      (first, second) =>
        Date.parse(second.occurredAtIso) -
        Date.parse(first.occurredAtIso),
    )
    .slice(0, MAX_TIMELINE_EVENTS)
    .map<DashboardTimelineItem>((activity) => {
      const timestamp = formatDashboardEventTimestamp(
        activity.occurredAtIso,
        period,
      );

      return {
        id: activity.id,
        device: activity.device,
        event: activity.event,
        occurredAtIso: activity.occurredAtIso,
        timeLabel: timestamp.timelineLabel,
        fullTimeLabel: timestamp.accessibleLabel,
        status: activity.status,
      };
    });

  return {
    periodLabel,
    items,
  };
}

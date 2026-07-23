import type {
  ActivityStatus,
  DashboardPeriod,
  RecentActivity,
} from "@/components/types/dashboard";

const DASHBOARD_TIME_ZONE = "America/Sao_Paulo";
const MAX_TIMELINE_EVENTS = 8;

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DASHBOARD_TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

const numericDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
});

const monthDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

const accessibleDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

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

function uppercaseFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function formatTimelineLabel(
  date: Date,
  period: DashboardPeriod,
) {
  if (period === "today") {
    return timeFormatter.format(date);
  }

  if (period === "7d") {
    return `${uppercaseFirst(weekdayFormatter.format(date))}, ${numericDateFormatter.format(date)}`;
  }

  return monthDateFormatter.format(date);
}

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
      const date = new Date(activity.occurredAtIso);

      return {
        id: activity.id,
        device: activity.device,
        event: activity.event,
        occurredAtIso: activity.occurredAtIso,
        timeLabel: formatTimelineLabel(date, period),
        fullTimeLabel: accessibleDateFormatter.format(date),
        status: activity.status,
      };
    });

  return {
    periodLabel,
    items,
  };
}

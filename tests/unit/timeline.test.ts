import { describe, expect, it } from "vitest";

import { dashboardDatasets } from "@/lib/dashboard/datasets";
import { buildDashboardTimeline } from "@/lib/dashboard/timeline";
import type {
  DashboardPeriod,
  RecentActivity,
} from "@/lib/dashboard/types";

const labelCases = [
  ["today", "14:32"],
  ["7d", "Qua., 22/07"],
  ["30d", "22 de jul."],
] as const satisfies readonly [DashboardPeriod, string][];

describe("buildDashboardTimeline", () => {
  it("mantém oito eventos ordenados do mais recente ao mais antigo", () => {
    const reversedActivities = [
      ...dashboardDatasets.today.recentActivities,
    ].reverse();

    const timeline = buildDashboardTimeline(
      reversedActivities,
      "today",
      "Hoje",
    );

    expect(timeline.items).toHaveLength(8);
    expect(timeline.items.map((item) => item.id)).toEqual([
      "today-1",
      "today-2",
      "today-3",
      "today-4",
      "today-5",
      "today-6",
      "today-7",
      "today-8",
    ]);
    expect(
      timeline.items.every(
        (item, index, items) =>
          index === 0 ||
          Date.parse(items[index - 1].occurredAtIso) >=
            Date.parse(item.occurredAtIso),
      ),
    ).toBe(true);
  });

  it.each(labelCases)(
    "formata corretamente os labels de %s",
    (period, expectedLabel) => {
      const source =
        period === "today"
          ? dashboardDatasets.today
          : period === "7d"
            ? dashboardDatasets.last7Days
            : dashboardDatasets.last30Days;

      const timeline = buildDashboardTimeline(
        source.recentActivities,
        period,
        source.label,
      );

      expect(timeline.items[0].timeLabel).toBe(expectedLabel);
      expect(timeline.items[0].occurredAtIso).toBe(
        source.recentActivities[0].occurredAtIso,
      );
    },
  );

  it("preserva IDs e timestamps dos mesmos eventos", () => {
    const timeline = buildDashboardTimeline(
      dashboardDatasets.last30Days.recentActivities,
      "30d",
      dashboardDatasets.last30Days.label,
    );

    for (const activity of dashboardDatasets.last30Days.recentActivities) {
      const timelineItem = timeline.items.find(
        (item) => item.id === activity.id,
      );

      expect(timelineItem?.occurredAtIso).toBe(activity.occurredAtIso);
    }
  });

  it("usa America/Sao_Paulo independentemente do timezone local", () => {
    const boundaryActivity: RecentActivity = {
      id: "timezone-boundary",
      device: "Sistema",
      event: "Evento próximo da virada UTC",
      occurredAt: "Valor legado não utilizado",
      occurredAtIso: "2026-07-23T01:30:00Z",
      status: "completed",
    };

    const timeline = buildDashboardTimeline(
      [boundaryActivity],
      "30d",
      "Últimos 30 dias",
    );

    expect(timeline.items[0].timeLabel).toBe("22 de jul.");
    expect(timeline.items[0].fullTimeLabel).toContain("22 de julho");
    expect(timeline.items[0].fullTimeLabel).toContain("22:30");
  });

  it("limita a timeline aos oito eventos mais recentes", () => {
    const activities = Array.from(
      { length: 9 },
      (_, index): RecentActivity => ({
        id: `activity-${index}`,
        device: "Sistema",
        event: `Evento ${index}`,
        occurredAt: "Texto legado",
        occurredAtIso: `2026-07-22T${String(index).padStart(2, "0")}:00:00-03:00`,
        status: "completed",
      }),
    );

    const timeline = buildDashboardTimeline(
      activities,
      "today",
      "Hoje",
    );

    expect(timeline.items).toHaveLength(8);
    expect(timeline.items[0].id).toBe("activity-8");
    expect(timeline.items.at(-1)?.id).toBe("activity-1");
    expect(timeline.items.some((item) => item.id === "activity-0")).toBe(
      false,
    );
  });
});

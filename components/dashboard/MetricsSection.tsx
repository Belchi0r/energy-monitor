import {
  Activity,
  CalendarDays,
  DollarSign,
  Power,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  MetricCard,
  type MetricCardProps,
} from "@/components/dashboard/MetricCard";
import type {
  DashboardMetric,
  MetricId,
} from "@/lib/dashboard/types";

const metricIcons: Record<MetricId, LucideIcon> = {
  periodConsumption: Activity,
  dailyAverage: CalendarDays,
  estimatedCost: DollarSign,
  monthlyConsumption: CalendarDays,
  activeDevices: Power,
  topDevice: Zap,
};

type MetricsSectionProps = {
  metrics: readonly DashboardMetric[];
  transitionKey: string;
};

export function MetricsSection({
  metrics,
  transitionKey,
}: MetricsSectionProps) {
  return (
    <section
      aria-label="Indicadores de consumo"
      key={transitionKey}
      className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]"
    >
      {metrics.map((metric, index) => {
        const cardProps: MetricCardProps = {
          title: metric.title,
          value: metric.value,
          format: metric.format,
          description: metric.description,
          icon: metricIcons[metric.id],
          comparison: metric.comparison,
          animationDelayMs: index * 50,
          emphasis:
            metric.id === "periodConsumption"
              ? "featured"
              : metric.id === "estimatedCost"
                ? "primary"
                : "secondary",
        };

        return <MetricCard key={metric.id} {...cardProps} />;
      })}
    </section>
  );
}

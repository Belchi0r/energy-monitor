import {
  Activity,
  CalendarDays,
  DollarSign,
  Gauge,
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
} from "@/components/types/dashboard";

const metricIcons: Record<MetricId, LucideIcon> = {
  currentPower: Gauge,
  periodConsumption: Activity,
  dailyAverage: CalendarDays,
  estimatedCost: DollarSign,
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
      className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
        };

        return <MetricCard key={metric.id} {...cardProps} />;
      })}
    </section>
  );
}

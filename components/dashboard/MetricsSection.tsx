import {
  Activity,
  DollarSign,
  Gauge,
  Power,
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
  dailyConsumption: Activity,
  estimatedCost: DollarSign,
  activeDevices: Power,
};

type MetricsSectionProps = {
  metrics: readonly DashboardMetric[];
};

export function MetricsSection({ metrics }: MetricsSectionProps) {
  return (
    <section
      aria-label="Indicadores de consumo"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric, index) => {
        const cardProps: MetricCardProps = {
          title: metric.title,
          value: metric.value,
          format: metric.format,
          description: metric.description,
          icon: metricIcons[metric.id],
          animationDelayMs: index * 50,
        };

        return <MetricCard key={metric.id} {...cardProps} />;
      })}
    </section>
  );
}

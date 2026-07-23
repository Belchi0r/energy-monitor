import {
  CircleCheck,
  CircleDot,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type { ActivityStatus } from "@/components/types/dashboard";

const statusConfig: Record<
  ActivityStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  active: {
    label: "Em andamento",
    icon: CircleDot,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
  completed: {
    label: "Concluído",
    icon: CircleCheck,
    className: "bg-slate-100 text-slate-600 ring-slate-600/10",
  },
  attention: {
    label: "Requer atenção",
    icon: TriangleAlert,
    className: "bg-amber-50 text-amber-700 ring-amber-600/15",
  },
};

export function getTimelineStatusLabel(status: ActivityStatus) {
  return statusConfig[status].label;
}

type TimelineMarkerProps = {
  status: ActivityStatus;
  isLast: boolean;
};

export function TimelineMarker({
  status,
  isLast,
}: TimelineMarkerProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className="relative flex h-full min-h-16 justify-center">
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-8 h-[calc(100%+0.75rem)] w-px -translate-x-1/2 bg-slate-200"
        />
      ) : null}
      <span
        className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${config.className}`}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        <span className="sr-only">{config.label}</span>
      </span>
    </span>
  );
}

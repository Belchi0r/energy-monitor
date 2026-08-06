import { FlaskConical, House } from "lucide-react";
import Link from "next/link";

import type { DashboardDataMode } from "@/lib/dashboard/types";

type DataModeSelectorProps = {
  mode: DashboardDataMode;
  homeHref: string;
  demoHref: string;
};

export function DataModeSelector({
  mode,
  homeHref,
  demoHref,
}: DataModeSelectorProps) {
  return (
    <nav
      aria-label="Origem dos dados"
      className="grid min-w-0 grid-cols-2 rounded-xl bg-slate-100 p-1 sm:min-w-80"
    >
      {([
        { value: "home", label: "Minha residência", href: homeHref },
        { value: "demo", label: "Demonstração", href: demoHref },
      ] as const).map((option) => {
        const selected = option.value === mode;
        const Icon = option.value === "home" ? House : FlaskConical;

        return (
          <Link
            key={option.value}
            href={option.href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-center text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-reduce:transition-none ${selected ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

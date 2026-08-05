"use client";

import {
  BadgeInfo,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { NavigationLinks } from "@/components/layout/NavigationLinks";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-68 shrink-0 bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100 xl:sticky xl:top-0 xl:flex xl:h-screen xl:flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30">
          <Zap aria-hidden="true" className="size-5" strokeWidth={2.4} />
        </span>
        <div>
          <p className="text-base font-semibold tracking-tight text-white">
            Energy Monitor
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Painel de consumo</p>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-4 py-5">
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Monitoramento
        </p>
        <NavigationLinks pathname={pathname} />
      </nav>

      <div className="m-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <BadgeInfo aria-hidden="true" className="size-4 text-emerald-300" />
          Modo demonstração
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Estimativas e cenÃ¡rios demonstrativos, sem monitoramento em tempo
          real.
        </p>
      </div>

      <div className="px-4 pb-4">
        <LogoutButton variant="dark" />
      </div>
    </aside>
  );
}

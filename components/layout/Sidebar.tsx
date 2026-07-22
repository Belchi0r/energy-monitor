import {
  BadgeInfo,
  Bell,
  Clock3,
  Cpu,
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";

const navigationItems = [
  { label: "Visão geral", icon: LayoutDashboard, isActive: true },
  { label: "Dispositivos", icon: Cpu, isActive: false },
  { label: "Histórico", icon: Clock3, isActive: false },
  { label: "Alertas", icon: Bell, isActive: false },
  { label: "Configurações", icon: Settings, isActive: false },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 bg-slate-950 text-slate-100 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-7 py-6">
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

      <nav aria-label="Navegação principal" className="flex-1 px-4 py-6">
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Monitoramento
        </p>
        <ul className="mt-3 space-y-1.5">
          {navigationItems.map(({ label, icon: Icon, isActive }) => (
            <li key={label}>
              {isActive ? (
                <Link
                  href="/"
                  aria-current="page"
                  className="flex min-h-11 items-center gap-3 rounded-xl bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-emerald-300"
                >
                  <span
                    aria-hidden="true"
                    className="h-5 w-1 rounded-full bg-emerald-400"
                  />
                  <Icon aria-hidden="true" className="size-5 text-emerald-300" />
                  <span>{label}</span>
                  <span className="sr-only">, página atual</span>
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-11 cursor-default items-center gap-3 rounded-xl px-4 text-sm font-medium text-slate-400"
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span>{label}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="m-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <BadgeInfo aria-hidden="true" className="size-4 text-emerald-300" />
          Modo demonstração
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Interface preenchida apenas com dados simulados.
        </p>
      </div>
    </aside>
  );
}

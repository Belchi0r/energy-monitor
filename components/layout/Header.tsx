import { UserRound, Zap } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="flex min-h-18 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 lg:hidden">
            <Zap aria-hidden="true" className="size-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 lg:text-base">
              <span className="lg:hidden">Energy Monitor</span>
              <span className="hidden lg:inline">Dashboard de energia</span>
            </p>
            <p className="truncate text-xs text-slate-500">Visão geral</p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-3"
          aria-label="Usuário de demonstração"
          role="group"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-800">Visitante</p>
            <p className="text-xs text-slate-500">Acesso demonstrativo</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600">
            <UserRound aria-hidden="true" className="size-5" />
          </span>
        </div>
      </div>
    </header>
  );
}

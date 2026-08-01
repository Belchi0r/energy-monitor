"use client";

import { UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { getCurrentNavigationItem } from "@/components/layout/navigation";

export function Header() {
  const pathname = usePathname();
  const currentItem = getCurrentNavigationItem(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 xl:px-8">
        <Link
          href="/"
          aria-label="Energy Monitor — ir para a visão geral"
          className="group flex min-w-0 items-center gap-2 rounded-xl sm:gap-3 xl:hidden"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-emerald-300 shadow-sm ring-1 ring-slate-800 transition-colors duration-200 group-hover:bg-slate-900 motion-reduce:transition-none sm:size-10">
            <Zap aria-hidden="true" className="size-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
              Energy Monitor
            </p>
            <p className="truncate text-xs font-medium text-slate-500">
              {currentItem.label}
            </p>
          </div>
        </Link>

        <div className="hidden min-w-0 xl:block">
          <p className="truncate text-sm font-semibold text-slate-900">
            Energy Monitor
          </p>
          <p className="truncate text-xs text-slate-500">
            {currentItem.label}
          </p>
        </div>

        <MobileNavigation pathname={pathname} />

        <div
          className="hidden shrink-0 items-center gap-3 xl:flex"
          aria-label="Usuário de demonstração"
          role="group"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">Visitante</p>
            <p className="text-xs text-slate-500">Acesso demonstrativo</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600">
            <UserRound aria-hidden="true" className="size-4.5" />
          </span>
        </div>
      </div>
    </header>
  );
}

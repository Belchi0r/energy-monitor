import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 xl:flex">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Pular para o conteúdo
      </a>

      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

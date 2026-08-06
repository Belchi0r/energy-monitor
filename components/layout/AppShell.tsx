"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { isAuthPagePath } from "@/lib/auth/routes";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  if (isAuthPagePath(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 xl:flex">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Pular para o conteúdo
      </a>

      <Suspense
        fallback={
          <aside className="hidden w-68 shrink-0 bg-slate-950 xl:block xl:h-screen" />
        }
      >
        <Sidebar />
      </Suspense>

      <div className="min-w-0 flex-1">
        <Suspense
          fallback={
            <div className="h-16 border-b border-slate-200/80 bg-white" />
          }
        >
          <Header />
        </Suspense>

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

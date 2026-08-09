import { FlaskConical, LogIn, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import {
  getPublicDemoCanonicalRedirect,
  parsePublicDemoSearchParams,
  type PublicDemoSearchParams,
} from "@/components/utils/public-demo-route";
import { getPublicDemoDashboard } from "@/lib/dashboard/public-demo";

export const metadata: Metadata = {
  title: "Demonstração | Energy Monitor",
  description:
    "Explore o Energy Monitor com dados exclusivamente simulados.",
};

type PublicDemoPageProps = {
  searchParams: Promise<PublicDemoSearchParams>;
};

export default async function PublicDemoPage({
  searchParams,
}: PublicDemoPageProps) {
  const routeState = parsePublicDemoSearchParams(await searchParams);
  const canonicalRedirect = getPublicDemoCanonicalRedirect(routeState);

  if (canonicalRedirect) {
    redirect(canonicalRedirect);
  }

  const view = await getPublicDemoDashboard({
    period: routeState.period,
    compare: routeState.compare,
  });

  return (
    <div className="min-h-dvh bg-slate-50">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] flex-col items-stretch gap-2.5 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/demo"
            aria-label="Energy Monitor — início da demonstração"
            className="group flex min-w-0 items-center gap-2.5 rounded-xl"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-emerald-300 shadow-sm ring-1 ring-slate-800 transition-colors duration-200 group-hover:bg-slate-900 motion-reduce:transition-none sm:size-10">
              <Zap aria-hidden="true" className="size-5" strokeWidth={2.4} />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
              Energy Monitor
            </span>
          </Link>

          <div className="flex min-w-0 flex-col items-stretch gap-2 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between sm:w-auto sm:justify-end sm:gap-3">
            <span className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900">
              <FlaskConical aria-hidden="true" className="size-3.5" />
              Dados simulados
            </span>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition-[border-color,background-color,box-shadow] hover:border-slate-400 hover:bg-slate-50 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-reduce:transition-none sm:px-4"
            >
              <LogIn aria-hidden="true" className="hidden size-4 sm:block" />
              Entrar na minha conta
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"
      >
        <DashboardOverview view={view} experience="public-demo" />
      </main>
    </div>
  );
}

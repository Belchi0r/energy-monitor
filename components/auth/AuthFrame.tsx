import {
  Activity,
  Gauge,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const experiencePoints = [
  {
    icon: Activity,
    title: "Consumo em contexto",
    description: "Indicadores claros para entender sua rotina energética.",
  },
  {
    icon: ShieldCheck,
    title: "Acesso protegido",
    description: "Sessão validada e dados isolados por conta.",
  },
  {
    icon: Gauge,
    title: "Decisões mais eficientes",
    description: "Histórico, alertas e recomendações no mesmo painel.",
  },
] as const;

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: AuthFrameProps) {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,0.1),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1380px] lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.78fr)]">
        <section className="flex flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-16">
          <Link
            href="/login"
            aria-label="Energy Monitor — ir para o login"
            className="flex w-fit items-center gap-3 rounded-xl text-white"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/50">
              <Zap aria-hidden="true" className="size-5" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">
                Energy Monitor
              </span>
              <span className="block text-xs text-slate-400">
                Inteligência para seu consumo
              </span>
            </span>
          </Link>

          <div className="my-auto hidden max-w-2xl py-14 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Energia sob controle
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl">
              Enxergue padrões. Reduza desperdícios. Consuma melhor.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              Uma visão objetiva do desempenho energético da sua casa, com
              segurança desde o primeiro acesso.
            </p>

            <div className="mt-10 grid max-w-2xl gap-4 xl:grid-cols-3">
              {experiencePoints.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm"
                >
                  <Icon aria-hidden="true" className="size-5 text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-100">
                    {title}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 hidden text-xs text-slate-600 lg:block">
            © {new Date().getFullYear()} Energy Monitor
          </p>
        </section>

        <section className="flex items-center px-4 pb-8 sm:px-8 lg:border-l lg:border-white/10 lg:bg-slate-950/45 lg:px-10 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {description}
            </p>

            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

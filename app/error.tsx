"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      aria-labelledby="error-title"
      className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 shadow-[var(--shadow-panel)] sm:p-8"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
        <CircleAlert aria-hidden="true" className="size-5" />
      </span>
      <h1
        id="error-title"
        className="mt-5 text-2xl font-semibold tracking-tight text-slate-950"
      >
        Não foi possível carregar esta área
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Ocorreu uma falha temporária ao buscar os dados. Nenhuma configuração
        foi alterada.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800 motion-reduce:transition-none"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Tentar novamente
      </button>
    </section>
  );
}

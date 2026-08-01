export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando conteúdo"
      className="animate-pulse space-y-5 motion-reduce:animate-none"
    >
      <span className="sr-only">Carregando página...</span>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:items-end">
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-emerald-100" />
          <div className="h-9 w-80 max-w-full rounded-xl bg-slate-200" />
          <div className="h-4 w-full max-w-2xl rounded bg-slate-200/80" />
        </div>
        <div className="h-16 rounded-2xl bg-emerald-100/70" />
      </div>

      <div className="h-14 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white" />

      <div className="grid overflow-hidden rounded-3xl border border-emerald-200 bg-white lg:grid-cols-12">
        <div className="h-48 bg-emerald-50/70 lg:col-span-3" />
        <div className="h-48 border-emerald-100 lg:col-span-5 lg:border-l" />
        <div className="h-48 bg-teal-50/40 lg:col-span-4 lg:border-l lg:border-emerald-100" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className={`h-32 rounded-2xl border border-slate-200 ${
              index === 0 ? "bg-emerald-50" : "bg-white"
            }`}
          />
        ))}
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        <div className="h-80 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-80 rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    </div>
  );
}

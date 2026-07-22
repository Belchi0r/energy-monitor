import {
  Activity,
  BarChart3,
  Clock3,
  DollarSign,
  Gauge,
  Power,
} from "lucide-react";

import {
  MetricCard,
  type MetricCardProps,
} from "@/components/dashboard/MetricCard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Panel } from "@/components/ui/Panel";

const metrics: MetricCardProps[] = [
  {
    title: "Potência atual",
    value: "1.420",
    unit: "W",
    description: "Demanda instantânea da residência",
    icon: Gauge,
  },
  {
    title: "Consumo hoje",
    value: "8,7",
    unit: "kWh",
    description: "Acumulado desde o início do dia",
    icon: Activity,
  },
  {
    title: "Custo estimado",
    value: "R$ 7,32",
    description: "Estimativa ilustrativa para hoje",
    icon: DollarSign,
  },
  {
    title: "Dispositivos ativos",
    value: "5",
    description: "Equipamentos consumindo energia",
    icon: Power,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section aria-labelledby="overview-title">
            <p className="text-sm font-semibold text-emerald-700">
              Monitoramento residencial
            </p>
            <h1
              id="overview-title"
              className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
            >
              Visão geral
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Acompanhe os principais indicadores de consumo de energia e tenha
              uma leitura rápida do comportamento dos seus dispositivos.
            </p>
          </section>

          <section
            aria-label="Indicadores de consumo"
            className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </section>

          <section
            aria-label="Visualizações de consumo"
            className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2"
          >
            <Panel
              title="Consumo ao longo do dia"
              description="Variação do consumo por horário"
            >
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200">
                  <BarChart3 aria-hidden="true" className="size-6" />
                </span>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  Visualização de consumo por horário
                </p>
                <p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">
                  O gráfico será exibido aqui quando os dados de monitoramento
                  estiverem disponíveis.
                </p>
              </div>
            </Panel>

            <Panel
              title="Consumo por dispositivo"
              description="Participação de cada equipamento no consumo total"
            >
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200">
                  <Gauge aria-hidden="true" className="size-6" />
                </span>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  Comparativo entre dispositivos
                </p>
                <p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">
                  A distribuição será apresentada aqui após a integração com os
                  dispositivos.
                </p>
              </div>
            </Panel>
          </section>

          <Panel
            title="Atividade recente"
            description="Últimos eventos registrados pelos dispositivos"
            className="mt-6"
          >
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Atividade recente dos dispositivos monitorados
                </caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 sm:px-5">
                      Dispositivo
                    </th>
                    <th scope="col" className="px-4 py-3 sm:px-5">
                      Evento
                    </th>
                    <th scope="col" className="px-4 py-3 sm:px-5">
                      Horário
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center sm:px-5">
                      <Clock3
                        aria-hidden="true"
                        className="mx-auto size-6 text-slate-400"
                      />
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Nenhuma atividade disponível nesta demonstração
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Os eventos dos dispositivos serão exibidos nesta área.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </main>
      </div>
    </div>
  );
}

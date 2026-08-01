"use client";

import {
  CalendarRange,
  CheckCircle2,
  GitCompareArrows,
  RotateCcw,
  Save,
  Zap,
} from "lucide-react";
import {
  useId,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/ui/Panel";
import {
  dashboardPeriodDefinitions,
  dashboardPeriods,
  isDashboardPeriod,
} from "@/lib/dashboard/periods";
import type { DashboardPeriod } from "@/lib/dashboard/types";

type SettingsPreferencesProps = {
  initialTariff: number;
};

type SaveStatus = "idle" | "saving" | "success" | "error";

type TariffResponse = {
  success: boolean;
  tariffInput?: string;
  message?: string;
};

const tariffInputFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

function isTariffResponse(value: unknown): value is TariffResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof value.success === "boolean"
  );
}

export function SettingsPreferences({
  initialTariff,
}: SettingsPreferencesProps) {
  const router = useRouter();
  const tariffId = useId();
  const tariffHelpId = useId();
  const tariffStatusId = useId();
  const periodId = useId();
  const comparisonId = useId();
  const initialTariffValue =
    tariffInputFormatter.format(initialTariff);
  const [tariff, setTariff] = useState(initialTariffValue);
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  function resetPreferences() {
    setTariff(initialTariffValue);
    setPeriod("today");
    setComparisonEnabled(true);
    setSaveStatus("idle");
    setSaveMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const response = await fetch("/api/settings/energy-tariff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tariff }),
      });
      const payload: unknown = await response.json();

      if (!isTariffResponse(payload)) {
        throw new Error(
          "Não foi possível confirmar o salvamento da tarifa.",
        );
      }

      if (!response.ok || !payload.success) {
        setSaveStatus("error");
        setSaveMessage(
          payload.message ?? "Informe uma tarifa válida.",
        );
        return;
      }

      if (payload.tariffInput) {
        setTariff(payload.tariffInput);
      }
      setSaveStatus("success");
      setSaveMessage(
        payload.message ?? "Tarifa salva neste navegador.",
      );
      router.refresh();
    } catch {
      setSaveStatus("error");
      setSaveMessage(
        "Não foi possível salvar a tarifa. Tente novamente.",
      );
    }
  }

  return (
    <Panel
      title="Preferências da dashboard"
      description="Preferências locais usadas nas estimativas da dashboard"
      className="min-w-0"
    >
      <form noValidate onSubmit={handleSubmit}>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Zap aria-hidden="true" className="size-5" />
            </span>
            <div>
              <label
                htmlFor={tariffId}
                className="text-sm font-semibold text-slate-900"
              >
                Tarifa de energia
              </label>
              <p className="text-xs text-slate-500">
                Valor usado nas estimativas por kWh
              </p>
            </div>
          </div>
          <div className="relative mt-5">
            <input
              id={tariffId}
              name="energyTariff"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([,.][0-9]{1,2})?"
              required
              aria-describedby={
                saveStatus === "success" || saveStatus === "error"
                  ? `${tariffHelpId} ${tariffStatusId}`
                  : tariffHelpId
              }
              aria-invalid={saveStatus === "error"}
              value={tariff}
              onChange={(event) => {
                setTariff(event.target.value);
                setSaveStatus("idle");
                setSaveMessage("");
              }}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-20 text-sm font-semibold tabular-nums text-slate-900"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">
              R$/kWh
            </span>
          </div>
          <p
            id={tariffHelpId}
            className="mt-2 text-xs leading-4 text-slate-500"
          >
            Aceita vírgula ou ponto e até duas casas decimais.
          </p>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CalendarRange aria-hidden="true" className="size-5" />
            </span>
            <div>
              <label
                htmlFor={periodId}
                className="text-sm font-semibold text-slate-900"
              >
                Período preferido
              </label>
              <p className="text-xs text-slate-500">
                Intervalo inicial da análise
              </p>
            </div>
          </div>
          <select
            id={periodId}
            value={period}
            onChange={(event) => {
              if (isDashboardPeriod(event.target.value)) {
                setPeriod(event.target.value);
                setSaveStatus("idle");
                setSaveMessage("");
              }
            }}
            className="mt-5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
          >
            {dashboardPeriods.map((option) => (
              <option key={option} value={option}>
                {dashboardPeriodDefinitions[option].label}
              </option>
            ))}
          </select>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <GitCompareArrows aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Comparação automática
              </p>
              <p className="text-xs text-slate-500">
                Exibir o período anterior
              </p>
            </div>
          </div>
          <label
            htmlFor={comparisonId}
            className="mt-5 flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-3"
          >
            <span className="text-sm font-medium text-slate-700">
              {comparisonEnabled ? "Ativada" : "Desativada"}
            </span>
            <input
              id={comparisonId}
              type="checkbox"
              checked={comparisonEnabled}
              onChange={(event) => {
                setComparisonEnabled(event.target.checked);
                setSaveStatus("idle");
                setSaveMessage("");
              }}
              className="size-4 accent-emerald-600"
            />
          </label>
        </section>
      </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm leading-5 text-slate-600">
                Enquanto o login não está disponível, a tarifa fica salva
                neste navegador. Período e comparação continuam
                demonstrativos e nada é enviado ao PostgreSQL.
              </p>
              {saveStatus === "success" ? (
                <p
                  id={tariffStatusId}
                  role="status"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {saveMessage}
                </p>
              ) : null}
              {saveStatus === "error" ? (
                <p
                  id={tariffStatusId}
                  role="alert"
                  className="mt-3 text-sm font-semibold text-rose-700"
                >
                  {saveMessage}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={resetPreferences}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 motion-reduce:transition-none"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Restaurar
              </button>
              <button
                type="submit"
                disabled={saveStatus === "saving"}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
              >
                <Save aria-hidden="true" className="size-4" />
                {saveStatus === "saving"
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Panel>
  );
}

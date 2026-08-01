"use client";

import {
  CircleCheck,
  Cpu,
  Plus,
  Search,
  SearchX,
  Trophy,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeviceFormDialog } from "@/components/dashboard/DeviceFormDialog";
import { DeviceSummaryCard } from "@/components/dashboard/DeviceSummaryCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Panel } from "@/components/ui/Panel";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { formatEnergy } from "@/lib/dashboard/formatters";
import type {
  DeviceInput,
  DeviceStatus,
  DeviceView,
} from "@/lib/devices/types";
import { formatDeviceDisplayName } from "@/lib/energy/advisor/energy-advisor.utils";
import type {
  DeviceApiErrorResponse,
  DeviceApiSuccessResponse,
} from "@/lib/types/device-api";

type DeviceStatusFilter = "all" | DeviceStatus;

const statusFilters = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
] as const satisfies readonly {
  value: DeviceStatusFilter;
  label: string;
}[];

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; deviceId: string }
  | null;

type DevicesWorkspaceProps = {
  initialDevices: readonly DeviceView[];
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

async function getApiErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as DeviceApiErrorResponse;

    return body.error.message;
  } catch {
    return "Não foi possível concluir a operação.";
  }
}

export function DevicesWorkspace({
  initialDevices,
}: DevicesWorkspaceProps) {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceView[]>(() => [
    ...initialDevices,
  ]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<DeviceStatusFilter>("all");
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [deviceToDelete, setDeviceToDelete] =
    useState<DeviceView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const normalizedSearch = normalizeSearchValue(search);
  const filteredDevices = devices.filter((device) => {
    const matchesSearch = normalizeSearchValue(device.name).includes(
      normalizedSearch,
    );
    const matchesStatus =
      statusFilter === "all" || device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const totalConsumptionKwh = devices.reduce(
    (total, device) =>
      total + device.estimatedDailyConsumptionKwh,
    0,
  );
  const activeDevices = devices.filter(
    (device) => device.status === "active",
  ).length;
  const topConsumer = devices.reduce<DeviceView | null>(
    (currentTop, device) =>
      !currentTop ||
      device.estimatedDailyConsumptionKwh >
        currentTop.estimatedDailyConsumptionKwh
        ? device
        : currentTop,
    null,
  );
  const editingDevice =
    editorState?.mode === "edit"
      ? devices.find((device) => device.id === editorState.deviceId)
      : undefined;
  const existingNames = devices
    .filter((device) => device.id !== editingDevice?.id)
    .map((device) => device.name);

  async function saveDevice(input: DeviceInput) {
    const editingId =
      editorState?.mode === "edit" ? editorState.deviceId : null;
    const response = await fetch(
      editingId
        ? `/api/devices/${encodeURIComponent(editingId)}`
        : "/api/devices",
      {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response));
    }

    const body = (await response.json()) as DeviceApiSuccessResponse;

    setDevices((current) =>
      editingId
        ? current.map((item) =>
            item.id === body.data.id ? body.data : item,
          )
        : [...current, body.data],
    );
    setFeedback(
      `${formatDeviceDisplayName(body.data.name)} foi ${editingId ? "atualizado" : "adicionado"} no cadastro persistente.`,
    );
    setEditorState(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deviceToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/devices/${encodeURIComponent(deviceToDelete.id)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        setFeedback(await getApiErrorMessage(response));
        return;
      }

      const deletedDevice = deviceToDelete;
      setDevices((current) =>
        current.filter((device) => device.id !== deletedDevice.id),
      );
      setDeviceToDelete(null);
      setFeedback(
        `${formatDeviceDisplayName(deletedDevice.name)} foi removido do cadastro persistente.`,
      );
      router.refresh();
    } catch {
      setFeedback("Não foi possível remover o dispositivo.");
    } finally {
      setIsDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventário residencial"
        title="Dispositivos"
        description="Organize os equipamentos cadastrados e veja como cada um participa da estimativa diária atual."
        demoDescription="O cadastro é persistido no PostgreSQL. Os consumos são estimativas demonstrativas calculadas com potência e tempo médio de uso."
        showBackLink
        action={
          <button
            type="button"
            onClick={() => setEditorState({ mode: "create" })}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow] duration-200 hover:bg-emerald-700 hover:shadow-md active:bg-emerald-800 motion-reduce:transition-none sm:w-auto"
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar dispositivo
          </button>
        }
      />

      <p className="sr-only" aria-live="polite">
        {feedback}
      </p>

      <div className="mt-8 space-y-6">
        <section
          aria-label="Resumo dos dispositivos"
          className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryCard
            title="Total de dispositivos"
            value={String(devices.length)}
            description="Equipamentos no cadastro persistente"
            icon={Cpu}
          />
          <SummaryCard
            title="Dispositivos ativos"
            value={String(activeDevices)}
            description="Marcados como ativos no momento"
            icon={CircleCheck}
          />
          <SummaryCard
            title="Consumo estimado"
            value={formatEnergy(totalConsumptionKwh)}
            description="Soma estimada dos dispositivos ativos"
            icon={Zap}
          />
          <SummaryCard
            title="Maior consumidor"
            value={
              topConsumer
                ? formatDeviceDisplayName(topConsumer.name)
                : "Nenhum"
            }
            description={
              topConsumer
                ? formatEnergy(
                    topConsumer.estimatedDailyConsumptionKwh,
                  )
                : "Adicione um dispositivo para comparar"
            }
            icon={Trophy}
          />
        </section>

        <Panel
          title="Dispositivos cadastrados"
          description={`${filteredDevices.length} de ${devices.length} dispositivos exibidos`}
          className="min-w-0"
        >
          <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full min-w-0 lg:max-w-md">
              <label
                htmlFor="device-search"
                className="text-sm font-semibold text-slate-800"
              >
                Buscar por nome
              </label>
              <div className="relative mt-2">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="device-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Digite o nome do dispositivo"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-950 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div
              role="group"
              aria-label="Filtrar dispositivos por status"
              className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1 lg:w-auto lg:min-w-72"
            >
              {statusFilters.map((option) => {
                const isActive = statusFilter === option.value;
                const count =
                  option.value === "all"
                    ? devices.length
                    : devices.filter(
                        (device) => device.status === option.value,
                      ).length;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(option.value)}
                    className={`min-h-10 rounded-lg px-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none ${
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {option.label}
                    <span className="ml-1 text-xs tabular-nums">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredDevices.length > 0 ? (
            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredDevices.map((device, index) => (
                <DeviceSummaryCard
                  key={device.id}
                  device={device}
                  totalConsumptionKwh={totalConsumptionKwh}
                  index={index}
                  onEdit={(selectedDevice) =>
                    setEditorState({
                      mode: "edit",
                      deviceId: selectedDevice.id,
                    })
                  }
                  onDelete={setDeviceToDelete}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                <SearchX aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-slate-950">
                Nenhum dispositivo encontrado
              </h2>
              <p className="mt-2 max-w-md text-sm leading-5 text-slate-500">
                Ajuste a busca ou o filtro de status para voltar a exibir os
                dispositivos cadastrados.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 motion-reduce:transition-none"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </Panel>
      </div>

      {editorState ? (
        <DeviceFormDialog
          key={
            editorState.mode === "edit"
              ? editorState.deviceId
              : "new-device"
          }
          device={editingDevice}
          existingNames={existingNames}
          onClose={() => setEditorState(null)}
          onSave={saveDevice}
        />
      ) : null}

      {deviceToDelete ? (
        <Modal
          title="Excluir dispositivo?"
          description="Essa ação remove o dispositivo do cadastro persistente."
          size="small"
          onClose={() => setDeviceToDelete(null)}
        >
          <p className="text-sm leading-6 text-slate-600">
            Você está prestes a excluir{" "}
            <strong className="font-semibold text-slate-950">
              {formatDeviceDisplayName(deviceToDelete.name)}
            </strong>
            . A exclusão continuará válida após recarregar a página.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              data-autofocus
              type="button"
              disabled={isDeleting}
              onClick={() => setDeviceToDelete(null)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              Manter dispositivo
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
            >
              {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

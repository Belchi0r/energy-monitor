"use client";

import { Check, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  deviceCategories,
  createFormWindowsForProfile,
  deviceToFormValues,
  emptyDeviceFormValues,
  formValuesToDeviceInput,
  getUsageProfilePreview,
  MAX_USAGE_WINDOWS,
  usageProfileOptions,
  validateDeviceForm,
  type DeviceFormErrors,
  type DeviceFormValues,
  type UsageWindowFormValues,
} from "@/components/dashboard/device-model";
import { Modal } from "@/components/ui/Modal";
import type { DeviceInput, DeviceView } from "@/lib/devices/types";

type DeviceFormDialogProps = {
  device?: DeviceView;
  existingNames: readonly string[];
  onClose: () => void;
  onSave: (input: DeviceInput) => Promise<void>;
};

function FieldError({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  return message ? (
    <p id={id} className="mt-1.5 text-xs font-medium text-rose-700">
      {message}
    </p>
  ) : null;
}

export function DeviceFormDialog({
  device,
  existingNames,
  onClose,
  onSave,
}: DeviceFormDialogProps) {
  const [values, setValues] = useState<DeviceFormValues>(() =>
    device ? deviceToFormValues(device) : emptyDeviceFormValues,
  );
  const [errors, setErrors] = useState<DeviceFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(device);
  const usageProfilePreview = getUsageProfilePreview(
    values.usageWindows,
  );

  function updateField<Key extends keyof DeviceFormValues>(
    field: Key,
    value: DeviceFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateUsageWindow(
    index: number,
    field: keyof UsageWindowFormValues,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      usageWindows: current.usageWindows.map((window, windowIndex) =>
        windowIndex === index
          ? { ...window, [field]: value }
          : window,
      ),
    }));
    setErrors((current) => ({
      ...current,
      usageWindows: undefined,
      [`usageWindows.${index}.${field}`]: undefined,
    }));
  }

  function updateUsageProfile(
    type: DeviceFormValues["usageProfileType"],
  ) {
    setValues((current) => ({
      ...current,
      usageProfileType: type,
      usageWindows: createFormWindowsForProfile(
        type,
        current.usageWindows,
      ),
    }));
    setErrors((current) => ({
      ...current,
      usageProfileType: undefined,
      usageWindows: undefined,
    }));
  }

  function addUsageWindow() {
    setValues((current) => ({
      ...current,
      usageWindows: [
        ...current.usageWindows,
        { startHour: "8", endHour: "12", weight: "1" },
      ],
    }));
    setErrors((current) => ({
      ...current,
      usageWindows: undefined,
    }));
  }

  function removeUsageWindow(index: number) {
    setValues((current) => ({
      ...current,
      usageWindows: current.usageWindows.filter(
        (_window, windowIndex) => windowIndex !== index,
      ),
    }));
    setErrors((current) => ({
      ...current,
      usageWindows: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDeviceForm(values, existingNames);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await onSave(formValuesToDeviceInput(values));
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o dispositivo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEditing ? "Editar dispositivo" : "Adicionar dispositivo"}
      description="As alterações serão salvas no cadastro persistente do PostgreSQL."
      onClose={onClose}
    >
      <form noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="device-name"
              className="text-sm font-semibold text-slate-800"
            >
              Nome
            </label>
            <input
              id="device-name"
              data-autofocus
              type="text"
              autoComplete="off"
              value={values.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "device-name-error" : undefined}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Ex.: Televisor da sala"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400"
            />
            <FieldError id="device-name-error" message={errors.name} />
          </div>

          <div>
            <label
              htmlFor="device-category"
              className="text-sm font-semibold text-slate-800"
            >
              Categoria
            </label>
            <select
              id="device-category"
              value={values.category}
              onChange={(event) =>
                updateField(
                  "category",
                  event.target.value as DeviceFormValues["category"],
                )
              }
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950"
            >
              {deviceCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">
              Status
            </legend>
            <div className="mt-2 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["active", "Ativo"],
                  ["inactive", "Inativo"],
                ] as const
              ).map(([status, label]) => (
                <label key={status} className="cursor-pointer">
                  <input
                    type="radio"
                    name="device-status"
                    value={status}
                    checked={values.status === status}
                    onChange={() => updateField("status", status)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-slate-500 transition-colors duration-200 peer-checked:bg-white peer-checked:text-slate-950 peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600 motion-reduce:transition-none">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="device-power"
              className="text-sm font-semibold text-slate-800"
            >
              Potência estimada
            </label>
            <div className="relative mt-2">
              <input
                id="device-power"
                type="number"
                min="1"
                max="50000"
                step="1"
                inputMode="numeric"
                value={values.powerWatts}
                aria-invalid={Boolean(errors.powerWatts)}
                aria-describedby={
                  errors.powerWatts ? "device-power-error" : undefined
                }
                onChange={(event) =>
                  updateField("powerWatts", event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm tabular-nums text-slate-950"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                W
              </span>
            </div>
            <FieldError
              id="device-power-error"
              message={errors.powerWatts}
            />
          </div>

          <div>
            <label
              htmlFor="device-hours"
              className="text-sm font-semibold text-slate-800"
            >
              Uso médio por dia
            </label>
            <div className="relative mt-2">
              <input
                id="device-hours"
                type="number"
                min="0.1"
                max="24"
                step="0.1"
                inputMode="decimal"
                value={values.averageDailyHours}
                aria-invalid={Boolean(errors.averageDailyHours)}
                aria-describedby={
                  errors.averageDailyHours
                    ? "device-hours-error"
                    : undefined
                }
                onChange={(event) =>
                  updateField("averageDailyHours", event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-14 text-sm tabular-nums text-slate-950"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                horas
              </span>
            </div>
            <FieldError
              id="device-hours-error"
              message={errors.averageDailyHours}
            />
          </div>
        </div>

        <section
          aria-labelledby="usage-profile-title"
          className="mt-6 border-t border-slate-200 pt-5"
        >
          <div>
            <h3
              id="usage-profile-title"
              className="text-base font-semibold text-slate-950"
            >
              Perfil de uso diário
            </h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Define quando o consumo estimado costuma ocorrer, sem alterar
              o total diário informado acima.
            </p>
          </div>

          <div className="mt-4">
            <label
              htmlFor="device-usage-profile"
              className="text-sm font-semibold text-slate-800"
            >
              Padrão de horários
            </label>
            <select
              id="device-usage-profile"
              value={values.usageProfileType}
              aria-invalid={Boolean(errors.usageProfileType)}
              aria-describedby={
                errors.usageProfileType
                  ? "device-usage-profile-error"
                  : undefined
              }
              onChange={(event) =>
                updateUsageProfile(
                  event.target
                    .value as DeviceFormValues["usageProfileType"],
                )
              }
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950"
            >
              {usageProfileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError
              id="device-usage-profile-error"
              message={errors.usageProfileType}
            />
          </div>

          {values.usageProfileType === "CUSTOM" ? (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-slate-800">
                Intervalos personalizados
              </legend>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                O peso define a participação relativa de cada intervalo.
                Os valores são normalizados automaticamente.
              </p>

              <div className="mt-3 space-y-3">
                {values.usageWindows.map((window, index) => {
                  const startErrorId = `usage-window-${index}-start-error`;
                  const endErrorId = `usage-window-${index}-end-error`;
                  const weightErrorId = `usage-window-${index}-weight-error`;

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start">
                        <div>
                          <label
                            htmlFor={`usage-window-${index}-start`}
                            className="text-xs font-semibold text-slate-700"
                          >
                            Início
                          </label>
                          <input
                            id={`usage-window-${index}-start`}
                            type="number"
                            min="0"
                            max="23"
                            step="1"
                            inputMode="numeric"
                            value={window.startHour}
                            aria-invalid={Boolean(
                              errors[
                                `usageWindows.${index}.startHour`
                              ],
                            )}
                            aria-describedby={
                              errors[
                                `usageWindows.${index}.startHour`
                              ]
                                ? startErrorId
                                : undefined
                            }
                            onChange={(event) =>
                              updateUsageWindow(
                                index,
                                "startHour",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm tabular-nums text-slate-950"
                          />
                          <FieldError
                            id={startErrorId}
                            message={
                              errors[
                                `usageWindows.${index}.startHour`
                              ]
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`usage-window-${index}-end`}
                            className="text-xs font-semibold text-slate-700"
                          >
                            Fim
                          </label>
                          <input
                            id={`usage-window-${index}-end`}
                            type="number"
                            min="1"
                            max="24"
                            step="1"
                            inputMode="numeric"
                            value={window.endHour}
                            aria-invalid={Boolean(
                              errors[`usageWindows.${index}.endHour`],
                            )}
                            aria-describedby={
                              errors[`usageWindows.${index}.endHour`]
                                ? endErrorId
                                : undefined
                            }
                            onChange={(event) =>
                              updateUsageWindow(
                                index,
                                "endHour",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm tabular-nums text-slate-950"
                          />
                          <FieldError
                            id={endErrorId}
                            message={
                              errors[`usageWindows.${index}.endHour`]
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`usage-window-${index}-weight`}
                            className="text-xs font-semibold text-slate-700"
                          >
                            Peso
                          </label>
                          <input
                            id={`usage-window-${index}-weight`}
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.1"
                            inputMode="decimal"
                            value={window.weight}
                            aria-invalid={Boolean(
                              errors[`usageWindows.${index}.weight`],
                            )}
                            aria-describedby={
                              errors[`usageWindows.${index}.weight`]
                                ? weightErrorId
                                : undefined
                            }
                            onChange={(event) =>
                              updateUsageWindow(
                                index,
                                "weight",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm tabular-nums text-slate-950"
                          />
                          <FieldError
                            id={weightErrorId}
                            message={
                              errors[`usageWindows.${index}.weight`]
                            }
                          />
                        </div>

                        <button
                          type="button"
                          aria-label={`Remover intervalo ${index + 1}`}
                          onClick={() => removeUsageWindow(index)}
                          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 motion-reduce:transition-none sm:mt-[1.625rem] sm:size-10 sm:px-0"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          <span className="sm:sr-only">
                            Remover intervalo
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <FieldError
                id="device-usage-windows-error"
                message={errors.usageWindows}
              />

              <button
                type="button"
                disabled={
                  values.usageWindows.length >= MAX_USAGE_WINDOWS
                }
                onClick={addUsageWindow}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:w-auto"
              >
                <Plus aria-hidden="true" className="size-4" />
                Adicionar intervalo
              </button>
            </fieldset>
          ) : null}

          <p
            aria-live="polite"
            className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium leading-5 text-emerald-800"
          >
            {usageProfilePreview}
          </p>
        </section>

        {submitError ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
          >
            {isEditing ? (
              <Save aria-hidden="true" className="size-4" />
            ) : (
              <Check aria-hidden="true" className="size-4" />
            )}
            {isSubmitting
              ? "Salvando..."
              : isEditing
                ? "Salvar alterações"
                : "Adicionar dispositivo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

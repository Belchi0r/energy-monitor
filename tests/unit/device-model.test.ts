import { describe, expect, it } from "vitest";

import {
  emptyDeviceFormValues,
  formValuesToDeviceInput,
  validateDeviceForm,
  type DeviceFormValues,
} from "@/components/dashboard/device-model";

const validValues: DeviceFormValues = {
  name: "Televisor da sala",
  category: "Eletrônicos",
  powerWatts: "180",
  averageDailyHours: "4.5",
  status: "active",
  usageProfileType: "SPLIT",
  usageWindows: [
    { startHour: "8", endHour: "12", weight: "0.5" },
    { startHour: "14", endHour: "18", weight: "0.5" },
  ],
};

describe("formulário de dispositivos", () => {
  it("valida e converte um formulário completo", () => {
    expect(validateDeviceForm(validValues, [])).toEqual({});
    expect(formValuesToDeviceInput(validValues)).toEqual({
      name: validValues.name,
      category: validValues.category,
      powerWatts: 180,
      averageDailyHours: 4.5,
      status: "active",
      usageProfileType: "SPLIT",
      usageWindows: [
        { startHour: 8, endHour: 12, weight: 0.5 },
        { startHour: 14, endHour: 18, weight: 0.5 },
      ],
    });
  });

  it("rejeita nome duplicado sem diferenciar maiúsculas", () => {
    const errors = validateDeviceForm(validValues, [
      "televisor da sala",
    ]);

    expect(errors.name).toContain("Já existe");
  });

  it("rejeita potência e horas fora dos limites", () => {
    const errors = validateDeviceForm(
      {
        ...emptyDeviceFormValues,
        name: "Aparelho",
        powerWatts: "0",
        averageDailyHours: "25",
      },
      [],
    );

    expect(errors.powerWatts).toBeDefined();
    expect(errors.averageDailyHours).toBeDefined();
  });

  it("valida janelas personalizadas e gera erros por campo", () => {
    const errors = validateDeviceForm(
      {
        ...validValues,
        usageProfileType: "CUSTOM",
        usageWindows: [
          { startHour: "18", endHour: "12", weight: "1" },
        ],
      },
      [],
    );

    expect(errors["usageWindows.0.endHour"]).toBeDefined();
  });
});

import type {
  DashboardDataset,
  TemporalUsagePoint,
} from "@/lib/dashboard/types";

const currentWeekdays = ["Ter", "Qua", "Qui", "Sex", "Sáb", "Dom", "Seg"] as const;
const previousWeekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function createMonthPoints(
  values: readonly number[],
  targetTotal: number,
  range: "current" | "previous",
): readonly TemporalUsagePoint[] {
  const sourceTotal = values.reduce((total, value) => total + value, 0);
  const adjustment = (sourceTotal - targetTotal) / values.length;
  const adjustedValues = values.map((value) =>
    Number((value - adjustment).toFixed(2)),
  );
  const roundedTotal = adjustedValues.reduce(
    (total, value) => total + value,
    0,
  );
  adjustedValues[adjustedValues.length - 1] = Number(
    (
      adjustedValues[adjustedValues.length - 1] +
      targetTotal -
      roundedTotal
    ).toFixed(2),
  );

  return adjustedValues.map((value, index) => {
    const isCurrent = range === "current";
    const firstMonthLastIndex = 7;
    const firstMonthStartDay = isCurrent ? 23 : 24;
    const day =
      index <= firstMonthLastIndex
        ? firstMonthStartDay + index
        : index - firstMonthLastIndex;
    const month =
      index <= firstMonthLastIndex
        ? isCurrent
          ? "jun."
          : "mai."
        : isCurrent
          ? "jul."
          : "jun.";
    const monthNumber =
      index <= firstMonthLastIndex
        ? isCurrent
          ? 6
          : 5
        : isCurrent
          ? 7
          : 6;
    const weekdayLabels = isCurrent ? currentWeekdays : previousWeekdays;
    const weekday = weekdayLabels[index % weekdayLabels.length];

    return {
      id: `day-${index + 1}`,
      label: `${weekday}, ${day} ${month}`,
      shortLabel: `${day}/${monthNumber}`,
      consumptionKwh: value,
      isWeekend: weekday === "Sáb" || weekday === "Dom",
    };
  });
}

const currentMonthValues = [
  7.9, 8.1, 8.5, 9.8, 9.2, 8.4, 8.6, 8.2, 8.7, 9.1,
  10.1, 9.5, 8.3, 8.8, 8.4, 8.1, 8.6, 9.7, 9.3, 8.5,
  8.9, 8.4, 8.2, 8.7, 9.9, 9.4, 8.6, 8.8, 8.3, 8.5,
] as const;

const previousMonthValues = [
  7.8, 8, 8.3, 9.4, 9, 8.2, 8.5, 8.1, 8.6, 8.9,
  9.8, 9.2, 8.4, 8.7, 8.2, 8, 8.5, 9.5, 9.1, 8.4,
  8.7, 8.3, 8.1, 8.6, 9.6, 9.2, 8.5, 8.7, 8.2, 8.4,
] as const;

export const last30DaysDataset = {
  id: "last30Days",
  label: "Últimos 30 dias",
  rangeLabel: "23 de junho a 22 de julho",
  daysCount: 30,
  granularity: "day",
  activeDevices: 9,
  energyUsage: createMonthPoints(currentMonthValues, 257.8, "current"),
  deviceConsumption: [
    { id: "air-conditioner", device: "Ar-condicionado", description: "Climatização no cenário demonstrativo", consumptionKwh: 91.5 },
    { id: "shower", device: "Chuveiro elétrico", description: "Aquecimento de água no período", consumptionKwh: 56.8 },
    { id: "refrigerator", device: "Geladeira", description: "Operação contínua de refrigeração", consumptionKwh: 43.5 },
    { id: "washing-machine", device: "Máquina de lavar", description: "Ciclos simulados de lavagem", consumptionKwh: 32.4 },
    { id: "others", device: "Outros", description: "Demais equipamentos agrupados", consumptionKwh: 33.6 },
  ],
  recentActivities: [
    { id: "month-1", device: "Ar-condicionado", event: "Maior participação mensal identificada", occurredAt: "Hoje, 14:32", occurredAtIso: "2026-07-22T14:32:00-03:00", status: "attention" },
    { id: "month-2", device: "Chuveiro elétrico", event: "Rotina semanal concluída", occurredAt: "21 jul., 19:18", occurredAtIso: "2026-07-21T19:18:00-03:00", status: "completed" },
    { id: "month-3", device: "Geladeira", event: "Consumo mensal dentro da faixa simulada", occurredAt: "18 jul., 12:47", occurredAtIso: "2026-07-18T12:47:00-03:00", status: "active" },
    { id: "month-4", device: "Máquina de lavar", event: "Oitavo ciclo mensal finalizado", occurredAt: "12 jul., 11:05", occurredAtIso: "2026-07-12T11:05:00-03:00", status: "completed" },
    { id: "month-5", device: "Iluminação externa", event: "Rotina noturna revisada", occurredAt: "5 jul., 18:12", occurredAtIso: "2026-07-05T18:12:00-03:00", status: "active" },
    { id: "month-6", device: "Forno elétrico", event: "Quarto uso mensal concluído", occurredAt: "30 jun., 20:08", occurredAtIso: "2026-06-30T20:08:00-03:00", status: "completed" },
    { id: "month-7", device: "Ar-condicionado", event: "Meta econômica semanal aplicada", occurredAt: "27 jun., 17:25", occurredAtIso: "2026-06-27T17:25:00-03:00", status: "active" },
    { id: "month-8", device: "Sistema", event: "Análise mensal inicializada", occurredAt: "23 jun., 00:10", occurredAtIso: "2026-06-23T00:10:00-03:00", status: "completed" },
  ],
} as const satisfies DashboardDataset;

export const previous30DaysDataset = {
  id: "previous30Days",
  label: "30 dias anteriores",
  rangeLabel: "24 de maio a 22 de junho",
  daysCount: 30,
  granularity: "day",
  activeDevices: 9,
  energyUsage: createMonthPoints(previousMonthValues, 254.2, "previous"),
  deviceConsumption: [
    { id: "air-conditioner", device: "Ar-condicionado", description: "Climatização no cenário demonstrativo", consumptionKwh: 89 },
    { id: "shower", device: "Chuveiro elétrico", description: "Aquecimento de água no período", consumptionKwh: 57.4 },
    { id: "refrigerator", device: "Geladeira", description: "Operação contínua de refrigeração", consumptionKwh: 43.2 },
    { id: "washing-machine", device: "Máquina de lavar", description: "Ciclos simulados de lavagem", consumptionKwh: 31.5 },
    { id: "others", device: "Outros", description: "Demais equipamentos agrupados", consumptionKwh: 33.1 },
  ],
  recentActivities: [],
} as const satisfies DashboardDataset;

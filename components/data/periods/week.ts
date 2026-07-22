import type { DashboardDataset } from "@/components/types/dashboard";

export const last7DaysDataset = {
  id: "last7Days",
  label: "Últimos 7 dias",
  rangeLabel: "16 a 22 de julho",
  daysCount: 7,
  granularity: "day",
  activeDevices: 7,
  energyUsage: [
    { id: "day-1", label: "Quinta-feira, 16 jul.", shortLabel: "Qui", consumptionKwh: 7.8 },
    { id: "day-2", label: "Sexta-feira, 17 jul.", shortLabel: "Sex", consumptionKwh: 8.5 },
    { id: "day-3", label: "Sábado, 18 jul.", shortLabel: "Sáb", consumptionKwh: 10.2, isWeekend: true },
    { id: "day-4", label: "Domingo, 19 jul.", shortLabel: "Dom", consumptionKwh: 9.1, isWeekend: true },
    { id: "day-5", label: "Segunda-feira, 20 jul.", shortLabel: "Seg", consumptionKwh: 8.8 },
    { id: "day-6", label: "Terça-feira, 21 jul.", shortLabel: "Ter", consumptionKwh: 8.7 },
    { id: "day-7", label: "Quarta-feira, 22 jul.", shortLabel: "Qua", consumptionKwh: 8.3 },
  ],
  deviceConsumption: [
    { id: "air-conditioner", device: "Ar-condicionado", description: "Climatização no cenário demonstrativo", consumptionKwh: 21.5 },
    { id: "shower", device: "Chuveiro elétrico", description: "Aquecimento de água no período", consumptionKwh: 14.2 },
    { id: "refrigerator", device: "Geladeira", description: "Operação contínua de refrigeração", consumptionKwh: 10.1 },
    { id: "washing-machine", device: "Máquina de lavar", description: "Ciclos simulados de lavagem", consumptionKwh: 7.5 },
    { id: "others", device: "Outros", description: "Demais equipamentos agrupados", consumptionKwh: 8.1 },
  ],
  recentActivities: [
    { id: "week-1", device: "Ar-condicionado", event: "Maior consumo semanal registrado", occurredAt: "Hoje, 14:32", status: "attention" },
    { id: "week-2", device: "Chuveiro elétrico", event: "Ciclo de aquecimento encerrado", occurredAt: "Terça, 19:18", status: "completed" },
    { id: "week-3", device: "Geladeira", event: "Operação contínua dentro do padrão", occurredAt: "Segunda, 12:47", status: "active" },
    { id: "week-4", device: "Máquina de lavar", event: "Segundo ciclo semanal finalizado", occurredAt: "Domingo, 11:05", status: "completed" },
    { id: "week-5", device: "Iluminação externa", event: "Rotina noturna ativada", occurredAt: "Sábado, 18:12", status: "active" },
  ],
} as const satisfies DashboardDataset;

export const previous7DaysDataset = {
  id: "previous7Days",
  label: "7 dias anteriores",
  rangeLabel: "9 a 15 de julho",
  daysCount: 7,
  granularity: "day",
  activeDevices: 6,
  energyUsage: [
    { id: "day-1", label: "Quinta-feira, 9 jul.", shortLabel: "Qui", consumptionKwh: 7.5 },
    { id: "day-2", label: "Sexta-feira, 10 jul.", shortLabel: "Sex", consumptionKwh: 8.1 },
    { id: "day-3", label: "Sábado, 11 jul.", shortLabel: "Sáb", consumptionKwh: 8.9, isWeekend: true },
    { id: "day-4", label: "Domingo, 12 jul.", shortLabel: "Dom", consumptionKwh: 8, isWeekend: true },
    { id: "day-5", label: "Segunda-feira, 13 jul.", shortLabel: "Seg", consumptionKwh: 8.4 },
    { id: "day-6", label: "Terça-feira, 14 jul.", shortLabel: "Ter", consumptionKwh: 8.2 },
    { id: "day-7", label: "Quarta-feira, 15 jul.", shortLabel: "Qua", consumptionKwh: 7.8 },
  ],
  deviceConsumption: [
    { id: "air-conditioner", device: "Ar-condicionado", description: "Climatização no cenário demonstrativo", consumptionKwh: 18.7 },
    { id: "shower", device: "Chuveiro elétrico", description: "Aquecimento de água no período", consumptionKwh: 13.8 },
    { id: "refrigerator", device: "Geladeira", description: "Operação contínua de refrigeração", consumptionKwh: 9.8 },
    { id: "washing-machine", device: "Máquina de lavar", description: "Ciclos simulados de lavagem", consumptionKwh: 7 },
    { id: "others", device: "Outros", description: "Demais equipamentos agrupados", consumptionKwh: 7.6 },
  ],
  recentActivities: [],
} as const satisfies DashboardDataset;

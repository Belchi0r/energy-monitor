import type {
  AlignedTemporalPoint,
  DashboardDataset,
  DeviceConsumption,
  NumericComparison,
  TemporalUsagePoint,
  VariationDirection,
  VariationSignificance,
} from "@/components/types/dashboard";
import { formatRatioPercentage } from "@/components/utils/formatters";

const STABLE_THRESHOLD = 0.02;
const RELEVANT_THRESHOLD = 0.1;
const DATA_TOLERANCE = 0.02;

function getDirection(
  percentageChange: number | null,
  absoluteChange: number,
): VariationDirection {
  if (
    Math.abs(absoluteChange) < DATA_TOLERANCE ||
    (percentageChange !== null &&
      Math.abs(percentageChange) < STABLE_THRESHOLD)
  ) {
    return "stable";
  }

  return absoluteChange > 0 ? "increase" : "decrease";
}

function getSignificance(
  percentageChange: number | null,
): VariationSignificance {
  if (percentageChange === null) {
    return "relevant";
  }

  const magnitude = Math.abs(percentageChange);

  if (magnitude < STABLE_THRESHOLD) {
    return "stable";
  }

  return magnitude < RELEVANT_THRESHOLD ? "moderate" : "relevant";
}

export function compareNumbers(
  currentValue: number,
  previousValue: number,
  previousLabel: string,
): NumericComparison {
  const absoluteChange = currentValue - previousValue;
  const percentageChange =
    previousValue === 0 ? null : absoluteChange / previousValue;
  const direction = getDirection(percentageChange, absoluteChange);
  const significance =
    direction === "stable" ? "stable" : getSignificance(percentageChange);
  const formattedChange =
    percentageChange === null
      ? "sem base percentual"
      : formatRatioPercentage(Math.abs(percentageChange));
  const message =
    direction === "stable"
      ? `Sem alteração relevante em relação a ${previousLabel}.`
      : `${formattedChange} ${direction === "increase" ? "acima" : "abaixo"} de ${previousLabel}.`;

  return {
    previousValue,
    absoluteChange,
    percentageChange,
    direction,
    significance,
    previousLabel,
    message,
  };
}

export function alignTemporalSeries(
  current: readonly TemporalUsagePoint[],
  previous?: readonly TemporalUsagePoint[],
): readonly AlignedTemporalPoint[] {
  return current.map((point, index) => {
    const previousPoint = previous?.[index];

    return {
      id: point.id,
      index,
      axisLabel: point.shortLabel,
      currentLabel: point.label,
      previousLabel: previousPoint?.label,
      currentKwh: point.consumptionKwh,
      previousKwh: previousPoint?.consumptionKwh,
      isWeekend: point.isWeekend,
    };
  });
}

export function findPreviousDevice(
  device: DeviceConsumption,
  previous: readonly DeviceConsumption[] | undefined,
) {
  return previous?.find((item) => item.id === device.id);
}

export function sumEnergy(
  points: readonly TemporalUsagePoint[],
) {
  return points.reduce((total, point) => total + point.consumptionKwh, 0);
}

export function validateDashboardDataset(dataset: DashboardDataset) {
  const temporalTotal = sumEnergy(dataset.energyUsage);
  const deviceTotal = dataset.deviceConsumption.reduce(
    (total, device) => total + device.consumptionKwh,
    0,
  );

  if (
    dataset.energyUsage.length === 0 ||
    dataset.deviceConsumption.length === 0
  ) {
    throw new Error(`Dataset "${dataset.id}" não pode estar vazio.`);
  }

  if (Math.abs(temporalTotal - deviceTotal) > DATA_TOLERANCE) {
    throw new Error(
      `Dataset "${dataset.id}" possui totais temporais e por dispositivo divergentes.`,
    );
  }

  if (dataset.daysCount === 1 && dataset.energyUsage.length !== 12) {
    throw new Error(
      `Dataset diário "${dataset.id}" deve possuir 12 intervalos.`,
    );
  }

  if (dataset.daysCount > 1 && dataset.energyUsage.length !== dataset.daysCount) {
    throw new Error(
      `Dataset "${dataset.id}" deve possuir um ponto para cada dia.`,
    );
  }
}

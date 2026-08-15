import type { DashboardPeriod } from "@/lib/dashboard/types";

export const APPLICATION_CALENDAR_TIME_ZONE = "America/Sao_Paulo";

export type CalendarDateKey = `${number}-${number}-${number}`;

const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: APPLICATION_CALENDAR_TIME_ZONE,
});

const displayDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function parseCalendarDateKey(dateKey: CalendarDateKey) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error("Data de calendário inválida.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Data de calendário inválida.");
  }

  return { date };
}

function toDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as CalendarDateKey;
}

export function resolveApplicationDateKey(
  instant = new Date(),
): CalendarDateKey {
  const parts = Object.fromEntries(
    calendarFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}` as CalendarDateKey;
}

export function shiftCalendarDate(
  dateKey: CalendarDateKey,
  days: number,
): CalendarDateKey {
  const { date } = parseCalendarDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return toDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function calendarDateKeyToPrismaDate(
  dateKey: CalendarDateKey,
) {
  return parseCalendarDateKey(dateKey).date;
}

export function prismaDateToCalendarDateKey(date: Date) {
  return toDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function formatCalendarDateKey(dateKey: CalendarDateKey) {
  return displayDateFormatter.format(
    calendarDateKeyToPrismaDate(dateKey),
  );
}

export function isWeekendCalendarDate(dateKey: CalendarDateKey) {
  const day = calendarDateKeyToPrismaDate(dateKey).getUTCDay();
  return day === 0 || day === 6;
}

export function getExpectedPeriodDays(period: DashboardPeriod) {
  return period === "today" ? 1 : period === "7d" ? 7 : 30;
}

export function buildCalendarPeriodRange(
  endDate: CalendarDateKey,
  days: number,
) {
  return {
    startDate: shiftCalendarDate(endDate, -(days - 1)),
    endDate,
    days,
  };
}

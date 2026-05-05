import type { DetectedEvent, Era } from '@repo-saga/core';

export function formatEraPeriod(era: Pick<Era, 'periodLabel' | 'startYear' | 'endYear'>): string {
  if (era.periodLabel) return era.periodLabel;
  return era.startYear === era.endYear ? String(era.startYear) : `${era.startYear}–${era.endYear}`;
}

export function formatEventRange(event: Pick<DetectedEvent, 'startDate' | 'endDate' | 'startYear' | 'endYear'>): string {
  const start = shortDate(event.startDate);
  const end = shortDate(event.endDate);
  if (start && end) return start === end ? start : `${start}–${end}`;
  return event.startYear === event.endYear ? String(event.startYear) : `${event.startYear}–${event.endYear}`;
}

export function eventOverlapsEra(
  event: Pick<DetectedEvent, 'startDate' | 'endDate' | 'startYear' | 'endYear'>,
  era: Pick<Era, 'startDate' | 'endDate' | 'startYear' | 'endYear'>,
): boolean {
  const eventStart = parseDateStart(event.startDate);
  const eventEnd = parseDateEnd(event.endDate);
  const eraStart = parseDateStart(era.startDate);
  const eraEnd = parseDateEnd(era.endDate);
  if (Number.isFinite(eventStart) && Number.isFinite(eventEnd) && Number.isFinite(eraStart) && Number.isFinite(eraEnd)) {
    return eventEnd >= eraStart && eventStart <= eraEnd;
  }
  return event.endYear >= era.startYear && event.startYear <= era.endYear;
}

export function eraContainsDate(
  era: Pick<Era, 'startDate' | 'endDate' | 'startYear' | 'endYear'>,
  isoDate: string,
): boolean {
  const target = parseDateStart(isoDate);
  const eraStart = parseDateStart(era.startDate);
  const eraEnd = parseDateEnd(era.endDate);
  if (Number.isFinite(target) && Number.isFinite(eraStart) && Number.isFinite(eraEnd)) {
    return target >= eraStart && target <= eraEnd;
  }
  const year = new Date(isoDate).getUTCFullYear();
  return Number.isFinite(year) && year >= era.startYear && year <= era.endYear;
}

function parseDateStart(iso: string | undefined): number {
  if (!iso) return Number.NaN;
  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso;
  return new Date(withTime).getTime();
}

function parseDateEnd(iso: string | undefined): number {
  if (!iso) return Number.NaN;
  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T23:59:59Z` : iso;
  return new Date(withTime).getTime();
}

function shortDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

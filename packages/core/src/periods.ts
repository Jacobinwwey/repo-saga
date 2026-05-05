import type { DetectedEvent, Era } from './types.js';

export type EraSplit = 'auto' | 'year' | 'quarter' | 'month' | 'day';
export type EraGranularity = Exclude<EraSplit, 'auto'>;

export interface EraBoundary {
  startDate: string;
  endDate: string;
  periodLabel: string;
  startYear: number;
  endYear: number;
}

const DAY_MS = 86_400_000;

export function normalizeEraSplit(value: string | undefined): EraSplit | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'day-window') return 'day';
  if (normalized === 'auto' || normalized === 'year' || normalized === 'quarter' || normalized === 'month' || normalized === 'day') {
    return normalized;
  }
  return undefined;
}

export function createEraBoundaries(
  firstCommitDate: string,
  lastCommitDate: string,
  split: EraGranularity,
  dayWindow = 30,
): EraBoundary[] {
  const first = startOfUtcDay(firstCommitDate);
  const last = endOfUtcDay(lastCommitDate);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || first > last) return [];

  switch (split) {
    case 'year':
      return buildCalendarBoundaries(first, last, 'year');
    case 'quarter':
      return buildCalendarBoundaries(first, last, 'quarter');
    case 'month':
      return buildCalendarBoundaries(first, last, 'month');
    case 'day':
      return buildDayBoundaries(first, last, dayWindow);
  }
}

export function formatEraPeriod(era: Pick<Era, 'periodLabel' | 'startYear' | 'endYear'>): string {
  if (era.periodLabel) return era.periodLabel;
  return era.startYear === era.endYear ? String(era.startYear) : `${era.startYear}–${era.endYear}`;
}

export function eventOverlapsEra(event: DetectedEvent, era: Pick<Era, 'startDate' | 'endDate' | 'startYear' | 'endYear'>): boolean {
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

export function formatEventRange(event: Pick<DetectedEvent, 'startDate' | 'endDate' | 'startYear' | 'endYear'>): string {
  const start = shortDate(event.startDate);
  const end = shortDate(event.endDate);
  if (start && end) {
    return start === end ? start : `${start}–${end}`;
  }
  return event.startYear === event.endYear ? String(event.startYear) : `${event.startYear}–${event.endYear}`;
}

function buildCalendarBoundaries(first: Date, last: Date, split: 'year' | 'quarter' | 'month'): EraBoundary[] {
  const boundaries: EraBoundary[] = [];
  let cursor = alignToBoundary(first, split);
  while (cursor <= last) {
    const end = endOfBoundary(cursor, split);
    boundaries.push({
      startDate: toIsoDate(cursor),
      endDate: toIsoDate(end),
      periodLabel: formatBoundaryLabel(cursor, split),
      startYear: cursor.getUTCFullYear(),
      endYear: end.getUTCFullYear(),
    });
    cursor = addBoundary(cursor, split);
  }
  return boundaries;
}

function buildDayBoundaries(first: Date, last: Date, dayWindow: number): EraBoundary[] {
  const size = Math.max(1, Math.floor(dayWindow));
  const boundaries: EraBoundary[] = [];
  let cursor = first;
  while (cursor <= last) {
    const end = new Date(Math.min(last.getTime(), cursor.getTime() + (size - 1) * DAY_MS));
    boundaries.push({
      startDate: toIsoDate(cursor),
      endDate: toIsoDate(end),
      periodLabel: `${toIsoDate(cursor)}–${toIsoDate(end)}`,
      startYear: cursor.getUTCFullYear(),
      endYear: end.getUTCFullYear(),
    });
    cursor = new Date(cursor.getTime() + size * DAY_MS);
  }
  return boundaries;
}

function alignToBoundary(date: Date, split: 'year' | 'quarter' | 'month'): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (split === 'year') return new Date(Date.UTC(year, 0, 1));
  if (split === 'quarter') return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
  return new Date(Date.UTC(year, month, 1));
}

function endOfBoundary(date: Date, split: 'year' | 'quarter' | 'month'): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (split === 'year') return new Date(Date.UTC(year, 11, 31));
  if (split === 'quarter') return new Date(Date.UTC(year, month + 3, 0));
  return new Date(Date.UTC(year, month + 1, 0));
}

function addBoundary(date: Date, split: 'year' | 'quarter' | 'month'): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (split === 'year') return new Date(Date.UTC(year + 1, 0, 1));
  if (split === 'quarter') return new Date(Date.UTC(year, month + 3, 1));
  return new Date(Date.UTC(year, month + 1, 1));
}

function formatBoundaryLabel(date: Date, split: 'year' | 'quarter' | 'month'): string {
  const year = date.getUTCFullYear();
  if (split === 'year') return String(year);
  if (split === 'quarter') return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  return `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function startOfUtcDay(iso: string): Date {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return new Date(Number.NaN);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function endOfUtcDay(iso: string): Date {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return new Date(Number.NaN);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

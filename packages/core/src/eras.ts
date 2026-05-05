import { yearOf } from './analyzer.js';
import {
  createEraBoundaries,
  type EraGranularity,
  type EraSplit,
  eventOverlapsEra,
  formatEraPeriod,
} from './periods.js';
import type { AnalyzedRepo, DetectedEvent, Era, EventType, RawCommit } from './types.js';

const EVENT_TO_ERA: Record<EventType, { prefix: string; theme: string }> = {
  'initial-chaos': {
    prefix: 'Ancient Era',
    theme: 'foundations and improvisation',
  },
  'typescript-invasion': {
    prefix: 'Migration Era',
    theme: 'a typed people supplanting the old idioms',
  },
  'great-refactor-war': {
    prefix: 'Age of Civil War',
    theme: 'borders redrawn by sweeping refactors',
  },
  'testing-famine': {
    prefix: 'Lean Years',
    theme: 'tests are scarce and prayers carry the weight',
  },
  'testing-renaissance': {
    prefix: 'Renaissance',
    theme: 'a flowering of specs, fixtures, and CI rigour',
  },
  'linting-theocracy': {
    prefix: 'Theocratic Era',
    theme: 'a clergy of formatters and linters governs the code',
  },
  'container-empire': {
    prefix: 'Imperial Era',
    theme: 'every service speaks the language of containers',
  },
  'monorepo-federation': {
    prefix: 'Federation Era',
    theme: 'city-states united under one workspace banner',
  },
  'dependency-cataclysm': {
    prefix: 'Cataclysmic Era',
    theme: 'lockfiles tremble, version graphs are rewritten',
  },
  'founder-exodus': {
    prefix: 'Era of Departure',
    theme: 'old hands fade from the chronicle',
  },
  'new-dynasty': {
    prefix: 'New Dynasty',
    theme: 'fresh stewards inherit the codebase',
  },
  'ai-priesthood': {
    prefix: 'Age of the Oracle',
    theme: 'machine intelligence is wired into the daily liturgy',
  },
  'bug-plague': {
    prefix: 'The Dark Years',
    theme: 'a season of regressions and emergency hotfixes',
  },
  'release-empire': {
    prefix: 'Imperial Stability',
    theme: 'tags and releases drum out a steady tempo',
  },
};

export interface EraOptions {
  /** desired era count clamp (default 3..7) */
  minEras?: number;
  maxEras?: number;
  /** auto preserves the legacy heuristic grouping; other values force fixed time buckets */
  split?: EraSplit;
  /** bucket size in days when split = day */
  dayWindow?: number;
}

export function groupIntoEras(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
  opts: EraOptions = {},
): Era[] {
  const split = opts.split ?? 'auto';
  if (split !== 'auto') {
    return groupIntoFixedEras(repo, events, split, opts.dayWindow);
  }

  const minEras = opts.minEras ?? 3;
  const maxEras = opts.maxEras ?? 7;
  if (repo.commits.length === 0) return [];
  const firstYear = yearOf(repo.repo.firstCommitDate);
  const lastYear = yearOf(repo.repo.lastCommitDate);
  const span = Math.max(1, lastYear - firstYear + 1);

  let target = Math.round(span / 2);
  if (target < minEras) target = Math.min(minEras, span > 1 ? minEras : 2);
  if (target > maxEras) target = maxEras;
  if (events.length === 0) target = Math.max(2, Math.min(target, 3));
  if (span === 1) target = 2;

  const sortedEvents = [...events].sort((a, b) => a.startYear - b.startYear || b.score - a.score);
  const boundaries = chooseBoundaries(firstYear, lastYear, target, sortedEvents);

  const eras: Era[] = [];
  const claimedLeads = new Set<string>();
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startYear = boundaries[i];
    const endYear = boundaries[i + 1] - 1;
    if (endYear < startYear) continue;
    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;
    const inEra = sortedEvents.filter((e) => overlaps(e, startYear, endYear));
    eras.push(
      buildEra(
        i,
        eras.length,
        {
          startYear,
          endYear,
          startDate,
          endDate,
          periodLabel: startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`,
          granularity: 'year',
        },
        inEra,
        repo,
        claimedLeads,
      ),
    );
  }

  if (eras.length > 0) {
    eras[0].startYear = firstYear;
    eras[0].startDate = `${firstYear}-01-01`;
    eras[eras.length - 1].endYear = lastYear;
    eras[eras.length - 1].endDate = `${lastYear}-12-31`;
    for (const era of eras) {
      era.periodLabel = formatEraPeriod(era);
    }
  }
  return eras;
}

function groupIntoFixedEras(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
  split: EraGranularity,
  dayWindow?: number,
): Era[] {
  if (repo.commits.length === 0) return [];
  const boundaries = createEraBoundaries(repo.repo.firstCommitDate, repo.repo.lastCommitDate, split, dayWindow);
  const sortedEvents = [...events].sort((a, b) => b.score - a.score || a.startYear - b.startYear);
  const claimedLeads = new Set<string>();

  return boundaries.map((boundary, index) => {
    const eraShell: Era = {
      id: `era-${index + 1}`,
      name: boundary.periodLabel,
      startYear: boundary.startYear,
      endYear: boundary.endYear,
      startDate: boundary.startDate,
      endDate: boundary.endDate,
      periodLabel: boundary.periodLabel,
      granularity: split,
      theme: '',
      summary: '',
      summaryStats: { commits: 0, contributors: 0, insertions: 0, deletions: 0 },
      dominantEvents: [],
      evidence: [],
    };
    const inEra = sortedEvents.filter((event) => eventOverlapsEra(event, eraShell));
    return buildEra(index, index, { ...boundary, granularity: split }, inEra, repo, claimedLeads);
  });
}

function overlaps(event: DetectedEvent, startYear: number, endYear: number): boolean {
  return event.endYear >= startYear && event.startYear <= endYear;
}

function isLocalToEra(event: DetectedEvent, era: Pick<Era, 'startDate' | 'endDate' | 'startYear' | 'endYear'>): boolean {
  const eventStart = parseDateStart(event.startDate);
  const eventEnd = parseDateEnd(event.endDate);
  const eraStart = parseDateStart(era.startDate);
  const eraEnd = parseDateEnd(era.endDate);
  if (Number.isFinite(eventStart) && Number.isFinite(eventEnd) && Number.isFinite(eraStart) && Number.isFinite(eraEnd)) {
    const eraLen = Math.max(1, Math.round((eraEnd - eraStart) / DAY_MS) + 1);
    const evtLen = Math.max(1, Math.round((eventEnd - eventStart) / DAY_MS) + 1);
    const startsInEra = eventStart >= eraStart && eventStart <= eraEnd;
    return startsInEra || evtLen <= eraLen * 1.5;
  }
  const eraLen = era.endYear - era.startYear + 1;
  const evtLen = event.endYear - event.startYear + 1;
  const startsInEra = event.startYear >= era.startYear && event.startYear <= era.endYear;
  return startsInEra || evtLen <= eraLen * 1.5;
}

function chooseBoundaries(
  firstYear: number,
  lastYear: number,
  count: number,
  events: DetectedEvent[],
): number[] {
  const span = Math.max(1, lastYear - firstYear + 1);
  if (count <= 1) return [firstYear, lastYear + 1];
  const boundaries: number[] = [firstYear];
  for (let i = 1; i < count; i++) {
    boundaries.push(firstYear + Math.round((span * i) / count));
  }
  boundaries.push(lastYear + 1);

  if (events.length > 0) {
    const anchors = events
      .filter((e) => e.severity === 'epoch-defining' || e.severity === 'major')
      .map((e) => e.startYear)
      .filter((y) => y >= firstYear && y <= lastYear);
    for (let i = 1; i < boundaries.length - 1; i++) {
      const original = boundaries[i];
      let bestAnchor: number | undefined;
      let bestDist = 3;
      for (const a of anchors) {
        const dist = Math.abs(a - original);
        if (dist < bestDist) {
          bestAnchor = a;
          bestDist = dist;
        }
      }
      if (bestAnchor !== undefined) boundaries[i] = bestAnchor;
    }
  }

  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] <= boundaries[i - 1]) {
      boundaries[i] = boundaries[i - 1] + 1;
    }
  }
  if (boundaries[boundaries.length - 1] > lastYear + 1) {
    boundaries[boundaries.length - 1] = lastYear + 1;
  }
  return boundaries;
}

function buildEra(
  idx: number,
  positionalIdx: number,
  boundary: {
    startYear: number;
    endYear: number;
    startDate: string;
    endDate: string;
    periodLabel: string;
    granularity: EraGranularity;
  },
  inEra: DetectedEvent[],
  repo: AnalyzedRepo,
  claimedLeads: Set<string>,
): Era {
  const dominant = [...inEra].sort((a, b) => b.score - a.score);
  const provisionalEra: Era = {
    id: `era-${idx + 1}`,
    name: boundary.periodLabel,
    startYear: boundary.startYear,
    endYear: boundary.endYear,
    startDate: boundary.startDate,
    endDate: boundary.endDate,
    periodLabel: boundary.periodLabel,
    granularity: boundary.granularity,
    theme: '',
    summary: '',
    summaryStats: { commits: 0, contributors: 0, insertions: 0, deletions: 0 },
    dominantEvents: [],
    evidence: [],
  };
  const lead = dominant.find((e) => !claimedLeads.has(e.id) && isLocalToEra(e, provisionalEra));
  if (lead) claimedLeads.add(lead.id);
  const profile = lead ? EVENT_TO_ERA[lead.type] : undefined;

  const fallbackName = fallbackEraName(positionalIdx, repo, boundary.startYear, boundary.endYear);
  const name = profile && lead ? `${profile.prefix}: ${lead.title}` : fallbackName;
  const theme = profile?.theme ?? 'a quieter chapter between bigger upheavals';

  const summaryStats = computeEraStats(repo, boundary.startDate, boundary.endDate);
  const summary = composeSummary(summaryStats, boundary.periodLabel, dominant);
  const dominantEvents = dominant.slice(0, 4).map((e) => e.id);
  const evidence = composeEraEvidence(repo, boundary.periodLabel, boundary.granularity, boundary.startDate, boundary.endDate, dominant);

  return {
    id: `era-${idx + 1}`,
    name,
    startYear: boundary.startYear,
    endYear: boundary.endYear,
    startDate: boundary.startDate,
    endDate: boundary.endDate,
    periodLabel: boundary.periodLabel,
    granularity: boundary.granularity,
    theme,
    summary,
    summaryStats,
    dominantEvents,
    leadEventId: lead?.id,
    evidence,
  };
}

function computeEraStats(
  repo: AnalyzedRepo,
  startDate: string,
  endDate: string,
): { commits: number; contributors: number; insertions: number; deletions: number } {
  const start = parseDateStart(startDate);
  const end = parseDateEnd(endDate);
  const authors = new Set<string>();
  let commits = 0;
  let insertions = 0;
  let deletions = 0;

  for (const commit of repo.commits) {
    const time = parseDateStart(commit.date);
    if (!Number.isFinite(time) || time < start || time > end) continue;
    commits += 1;
    insertions += commit.insertions;
    deletions += commit.deletions;
    if (commit.authorEmail) authors.add(commit.authorEmail.toLowerCase());
  }
  return { commits, contributors: authors.size, insertions, deletions };
}

function fallbackEraName(
  positionalIdx: number,
  repo: AnalyzedRepo,
  startYear: number,
  _endYear: number,
): string {
  const totalCommits = repo.commits.length;
  const isFirst = startYear === yearOf(repo.repo.firstCommitDate);
  if (isFirst && totalCommits >= 1) return 'Founding Era: A Chronicle Begins';
  switch (positionalIdx) {
    case 0:
      return 'Founding Era: A Chronicle Begins';
    case 1:
      return 'Settler Era: Habits Take Root';
    case 2:
      return 'Middle Kingdom: A Slow Drift';
    case 3:
      return 'Reformation: Quiet Changes';
    case 4:
      return 'Late Era: Maturity Sets In';
    case 5:
      return 'Twilight Era: Steady Hands';
    default:
      return 'Modern Era: The Present Day';
  }
}

function composeSummary(
  stats: { commits: number; contributors: number; insertions: number; deletions: number },
  periodLabel: string,
  events: DetectedEvent[],
): string {
  const eventBit =
    events.length > 0
      ? `Defining moments: ${events.slice(0, 3).map((e) => e.title).join(', ')}.`
      : 'No defining heuristic events landed in this stretch — the chronicle ran quiet.';
  return `${periodLabel}: ${stats.commits.toLocaleString()} commits, ${stats.contributors} contributors, +${stats.insertions.toLocaleString()} / -${stats.deletions.toLocaleString()} lines. ${eventBit}`;
}

function composeEraEvidence(
  repo: AnalyzedRepo,
  periodLabel: string,
  granularity: EraGranularity,
  startDate: string,
  endDate: string,
  events: DetectedEvent[],
): string[] {
  const evidence: string[] = [];
  const commits = repo.commits.filter((commit) => isCommitInRange(commit, startDate, endDate)).length;
  evidence.push(`Covered ${periodLabel} (${granularity}) with ${commits.toLocaleString()} commits`);
  for (const e of events.slice(0, 3)) {
    evidence.push(`${e.title} (${eventDateRange(e)}) — ${e.evidence[0] ?? e.narrative}`);
  }
  return evidence;
}

function isCommitInRange(commit: RawCommit, startDate: string, endDate: string): boolean {
  const time = parseDateStart(commit.date);
  return time >= parseDateStart(startDate) && time <= parseDateEnd(endDate);
}

function eventDateRange(event: DetectedEvent): string {
  const start = shortDate(event.startDate);
  const end = shortDate(event.endDate);
  if (start && end) return start === end ? start : `${start}–${end}`;
  return event.startYear === event.endYear ? String(event.startYear) : `${event.startYear}–${event.endYear}`;
}

const DAY_MS = 86_400_000;

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

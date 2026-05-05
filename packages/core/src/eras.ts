import { yearOf } from './analyzer.js';
import type { AnalyzedRepo, DetectedEvent, Era, EventType, RawCommit, TimelineGranularity } from './types.js';

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
  timelineGranularity?: TimelineGranularity;
  bucketDays?: number;
}

export function groupIntoEras(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
  opts: EraOptions = {},
): Era[] {
  const timelineGranularity = opts.timelineGranularity ?? 'year';
  if (timelineGranularity !== 'year') {
    return groupIntoTemporalEras(repo, events, timelineGranularity, opts.bucketDays);
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
    const inEra = sortedEvents.filter((e) => overlaps(e, startYear, endYear));
    eras.push(buildEra(i, eras.length, startYear, endYear, inEra, repo, claimedLeads));
  }

  // Always make sure at least the first era covers the founding year and the last era reaches lastYear.
  if (eras.length > 0) {
    eras[0].startYear = firstYear;
    eras[eras.length - 1].endYear = lastYear;
  }
  return eras;
}

interface TimelineBucket {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  commits: RawCommit[];
  contributors: number;
  insertions: number;
  deletions: number;
}

function groupIntoTemporalEras(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
  granularity: TimelineGranularity,
  bucketDays?: number,
): Era[] {
  const buckets = buildTimelineBucketsForRepo(repo, granularity, bucketDays);
  if (buckets.length === 0) return [];

  const syntheticBaseYear = 2001;
  const mappedEvents = mapEventsToTimeline(repo, events, granularity, bucketDays);

  const claimedLeads = new Set<string>();
  return buckets.map((bucket, index) => {
    const syntheticYear = syntheticBaseYear + index;
    const inEra = mappedEvents.filter((event) => overlaps(event, syntheticYear, syntheticYear));
    const dominant = [...inEra].sort((a, b) => b.score - a.score);
    const lead = dominant.find(
      (event) => !claimedLeads.has(event.id) && isLocalToEra(event, syntheticYear, syntheticYear),
    );
    if (lead) claimedLeads.add(lead.id);
    const profile = lead ? EVENT_TO_ERA[lead.type] : undefined;
    const fallbackName = temporalFallbackEraName(index);
    const name = profile && lead ? `${profile.prefix}: ${lead.title}` : fallbackName;
    const theme = profile?.theme ?? `the chronicle narrows to ${bucket.label}`;

    return {
      id: `era-${index + 1}`,
      name,
      startYear: syntheticYear,
      endYear: syntheticYear,
      startDate: bucket.startDate,
      endDate: bucket.endDate,
      displayStartLabel: bucket.label,
      displayEndLabel: bucket.label,
      theme,
      summary: composeTemporalSummary(bucket, dominant),
      summaryStats: {
        commits: bucket.commits.length,
        contributors: bucket.contributors,
        insertions: bucket.insertions,
        deletions: bucket.deletions,
      },
      dominantEvents: dominant.slice(0, 4).map((event) => event.id),
      leadEventId: lead?.id,
      evidence: composeTemporalEvidence(bucket, dominant),
    };
  });
}

export function mapEventsToTimeline(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
  granularity: TimelineGranularity,
  bucketDays?: number,
): DetectedEvent[] {
  if (granularity === 'year') return events;
  const buckets = buildTimelineBucketsForRepo(repo, granularity, bucketDays);
  if (buckets.length === 0) return events;

  const syntheticBaseYear = 2001;
  return events.map((event) => {
    const startIndex = findBucketIndexForBoundary(event.startDate, buckets, 'start');
    const endIndex = findBucketIndexForBoundary(event.endDate, buckets, 'end');
    const clampedEndIndex = Math.max(startIndex, endIndex);
    const startYear = syntheticBaseYear + startIndex;
    const endYear = syntheticBaseYear + clampedEndIndex;
    return {
      ...event,
      startYear,
      endYear,
      displayStartLabel: buckets[startIndex]?.label ?? event.displayStartLabel ?? event.startDate,
      displayEndLabel: buckets[clampedEndIndex]?.label ?? event.displayEndLabel ?? event.endDate,
    };
  });
}

function temporalFallbackEraName(positionalIdx: number): string {
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

function buildTimelineBucketsForRepo(
  repo: AnalyzedRepo,
  granularity: TimelineGranularity,
  bucketDays?: number,
): TimelineBucket[] {
  const daysAnchorDate = granularity === 'days' ? firstCommitDay(repo.commits) : undefined;
  return buildTimelineBuckets(repo.commits, granularity, bucketDays, daysAnchorDate);
}

function buildTimelineBuckets(
  commits: RawCommit[],
  granularity: TimelineGranularity,
  bucketDays?: number,
  daysAnchorDate?: string,
): TimelineBucket[] {
  const groups = new Map<string, TimelineBucket>();
  const normalizedDays = Math.max(1, bucketDays ?? 30);
  for (const commit of commits) {
    const info = timelineInfoForDate(commit.date, granularity, normalizedDays, daysAnchorDate);
    const existing = groups.get(info.key) ?? {
      key: info.key,
      label: info.label,
      startDate: info.startDate,
      endDate: info.endDate,
      commits: [],
      contributors: 0,
      insertions: 0,
      deletions: 0,
    };
    existing.commits.push(commit);
    existing.insertions += commit.insertions;
    existing.deletions += commit.deletions;
    groups.set(info.key, existing);
  }

  return [...groups.values()]
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .map((bucket) => ({
      ...bucket,
      contributors: new Set(
        bucket.commits
          .map((commit) => (commit.authorEmail || commit.authorName || 'unknown').toLowerCase())
          .filter(Boolean),
      ).size,
    }));
}

function composeTemporalSummary(bucket: TimelineBucket, events: DetectedEvent[]): string {
  const eventBit =
    events.length > 0
      ? `Defining moments: ${events.slice(0, 3).map((event) => event.title).join(', ')}.`
      : 'No defining heuristic events landed in this stretch — the chronicle ran quiet.';
  return `${bucket.label}: ${bucket.commits.length.toLocaleString()} commits, ${bucket.contributors} contributors, +${bucket.insertions.toLocaleString()} / -${bucket.deletions.toLocaleString()} lines. ${eventBit}`;
}

function composeTemporalEvidence(bucket: TimelineBucket, events: DetectedEvent[]): string[] {
  const evidence = [
    `Period ${bucket.label} ran from ${bucket.startDate} to ${bucket.endDate}`,
    `${bucket.commits.length.toLocaleString()} commits, ${bucket.contributors} contributors, +${bucket.insertions.toLocaleString()} / -${bucket.deletions.toLocaleString()} lines`,
  ];
  if (bucket.commits[0]) evidence.push(`Opened with ${bucket.commits[0].subject}`);
  if (bucket.commits[bucket.commits.length - 1]) {
    evidence.push(`Closed with ${bucket.commits[bucket.commits.length - 1].subject}`);
  }
  for (const event of events.slice(0, 2)) {
    evidence.push(`${event.title} (${event.displayStartLabel ?? event.startYear}${event.displayEndLabel && event.displayEndLabel !== event.displayStartLabel ? `–${event.displayEndLabel}` : ''}) — ${event.evidence[0] ?? event.narrative}`);
  }
  return evidence;
}

function timelineInfoForDate(
  isoDate: string,
  granularity: TimelineGranularity,
  bucketDays: number,
  daysAnchorDate?: string,
): { key: string; label: string; startDate: string; endDate: string } {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return {
      key: isoDate,
      label: isoDate,
      startDate: isoDate,
      endDate: isoDate,
    };
  }
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const day = parsed.getUTCDate();

  if (granularity === 'quarter') {
    const quarter = Math.floor(month / 3) + 1;
    const start = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
    const end = new Date(Date.UTC(year, quarter * 3, 0));
    return {
      key: `${year}-Q${quarter}`,
      label: `${year} Q${quarter}`,
      startDate: isoShort(start),
      endDate: isoShort(end),
    };
  }

  if (granularity === 'month') {
    const nextMonth = new Date(Date.UTC(year, month + 1, 0));
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${year}-${String(month + 1).padStart(2, '0')}`,
      startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      endDate: isoShort(nextMonth),
    };
  }

  if (granularity === 'days') {
    const epochDay = Math.floor(Date.UTC(year, month, day) / 86_400_000);
    const anchorDay = daysAnchorDate
      ? Math.floor(Date.parse(`${daysAnchorDate}T00:00:00Z`) / 86_400_000)
      : epochDay;
    const bucketIndex = Math.floor((epochDay - anchorDay) / bucketDays);
    const startDay = anchorDay + bucketIndex * bucketDays;
    const endDay = startDay + bucketDays - 1;
    const start = new Date(startDay * 86_400_000);
    const end = new Date(endDay * 86_400_000);
    return {
      key: `days-${bucketDays}-${bucketIndex}`,
      label: `${isoShort(start)} +${bucketDays}d`,
      startDate: isoShort(start),
      endDate: isoShort(end),
    };
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  return {
    key: String(year),
    label: String(year),
    startDate: isoShort(start),
    endDate: isoShort(end),
  };
}

function isoShort(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function firstCommitDay(commits: RawCommit[]): string | undefined {
  let earliest: string | undefined;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const commit of commits) {
    const ms = Date.parse(commit.date);
    if (Number.isNaN(ms) || ms >= earliestMs) continue;
    earliestMs = ms;
    earliest = commit.date;
  }
  return earliest?.slice(0, 10);
}

function findBucketIndexForBoundary(
  date: string,
  buckets: TimelineBucket[],
  boundary: 'start' | 'end',
): number {
  if (buckets.length === 0) return 0;
  const parsed = normalizeBoundaryDateMs(date, boundary);
  if (!Number.isFinite(parsed)) return boundary === 'start' ? 0 : buckets.length - 1;

  if (boundary === 'start') {
    for (let index = 0; index < buckets.length; index++) {
      if (parsed <= normalizeBoundaryDateMs(buckets[index].endDate, 'end')) return index;
    }
    return buckets.length - 1;
  }

  for (let index = buckets.length - 1; index >= 0; index--) {
    if (parsed >= normalizeBoundaryDateMs(buckets[index].startDate, 'start')) return index;
  }
  return 0;
}

function normalizeBoundaryDateMs(date: string, boundary: 'start' | 'end'): number {
  const normalized = /^\d{4}-\d{2}-\d{2}/.test(date)
    ? date.slice(0, 10)
    : `${date.slice(0, 4)}-${boundary === 'start' ? '01-01' : '12-31'}`;
  const suffix = boundary === 'start' ? 'T00:00:00Z' : 'T23:59:59Z';
  return Date.parse(`${normalized}${suffix}`);
}

function overlaps(event: DetectedEvent, startYear: number, endYear: number): boolean {
  return event.endYear >= startYear && event.startYear <= endYear;
}

// An event is "local" to an era if it isn't a long background drone.
// We reject events that strictly wrap the era AND span ≥1.5× its length.
function isLocalToEra(event: DetectedEvent, startYear: number, endYear: number): boolean {
  // An event can name an era if it "belongs" to it: either it originated
  // inside the era's window, or its full span fits within ~1.5× the era.
  // Without the originated-here clause, a long-running founder event
  // (e.g. typescript-invasion that runs 2018→present) would lose its
  // naming claim on the era where it actually began. Without the
  // length cap, that same event would also claim every later era it
  // happens to overlap, producing duplicate era names.
  const eraLen = endYear - startYear + 1;
  const evtLen = event.endYear - event.startYear + 1;
  const startsInEra = event.startYear >= startYear && event.startYear <= endYear;
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
  // Initial uniform boundaries
  const boundaries: number[] = [firstYear];
  for (let i = 1; i < count; i++) {
    boundaries.push(firstYear + Math.round((span * i) / count));
  }
  boundaries.push(lastYear + 1);

  // Snap each interior boundary to the closest "epoch-defining" or "major" event start year if within ±2 years
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

  // Ensure strictly increasing
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] <= boundaries[i - 1]) {
      boundaries[i] = boundaries[i - 1] + 1;
    }
  }
  // Cap last boundary to lastYear+1
  if (boundaries[boundaries.length - 1] > lastYear + 1) {
    boundaries[boundaries.length - 1] = lastYear + 1;
  }
  return boundaries;
}

function buildEra(
  idx: number,
  positionalIdx: number,
  startYear: number,
  endYear: number,
  inEra: DetectedEvent[],
  repo: AnalyzedRepo,
  claimedLeads: Set<string>,
): Era {
  const dominant = [...inEra].sort((a, b) => b.score - a.score);
  const lead = dominant.find(
    (e) => !claimedLeads.has(e.id) && isLocalToEra(e, startYear, endYear),
  );
  if (lead) claimedLeads.add(lead.id);
  const profile = lead ? EVENT_TO_ERA[lead.type] : undefined;

  const fallbackName = fallbackEraName(positionalIdx, repo, startYear, endYear);
  const name = profile && lead ? `${profile.prefix}: ${lead.title}` : fallbackName;
  const theme = profile?.theme ?? 'a quieter chapter between bigger upheavals';

  const summaryStats = computeEraStats(repo, startYear, endYear);
  const summary = composeSummary(summaryStats, startYear, endYear, dominant);
  const dominantEvents = dominant.slice(0, 4).map((e) => e.id);
  const evidence = composeEraEvidence(repo, startYear, endYear, dominant);

  return {
    id: `era-${idx + 1}`,
    name,
    startYear,
    endYear,
    startDate: `${startYear}-01-01`,
    endDate: `${endYear}-12-31`,
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
  startYear: number,
  endYear: number,
): { commits: number; contributors: number; insertions: number; deletions: number } {
  const yearStats = repo.yearly.filter((y) => y.year >= startYear && y.year <= endYear);
  const commits = yearStats.reduce((sum, y) => sum + y.commits, 0);
  const insertions = yearStats.reduce((sum, y) => sum + y.insertions, 0);
  const deletions = yearStats.reduce((sum, y) => sum + y.deletions, 0);
  const authors = new Set<string>();
  for (const c of repo.commits) {
    const y = yearOf(c.date);
    if (y >= startYear && y <= endYear && c.authorEmail) {
      authors.add(c.authorEmail.toLowerCase());
    }
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
  startYear: number,
  endYear: number,
  events: DetectedEvent[],
): string {
  const period = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
  const eventBit =
    events.length > 0
      ? `Defining moments: ${events.slice(0, 3).map((e) => e.title).join(', ')}.`
      : 'No defining heuristic events landed in this stretch — the chronicle ran quiet.';
  return `${period}: ${stats.commits.toLocaleString()} commits, ${stats.contributors} contributors, +${stats.insertions.toLocaleString()} / -${stats.deletions.toLocaleString()} lines. ${eventBit}`;
}

function composeEraEvidence(
  repo: AnalyzedRepo,
  startYear: number,
  endYear: number,
  events: DetectedEvent[],
): string[] {
  const evidence: string[] = [];
  const yearStats = repo.yearly.filter((y) => y.year >= startYear && y.year <= endYear);
  const commits = yearStats.reduce((sum, y) => sum + y.commits, 0);
  evidence.push(
    `Spanned ${endYear - startYear + 1} year(s) with ${commits.toLocaleString()} commits`,
  );
  for (const e of events.slice(0, 3)) {
    evidence.push(`${e.title} (${e.startYear}${e.endYear !== e.startYear ? `–${e.endYear}` : ''}) — ${e.evidence[0] ?? e.narrative}`);
  }
  return evidence;
}

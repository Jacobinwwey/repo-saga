import { yearOf } from './analyzer.js';
import type { AnalyzedRepo, DetectedEvent, Era, EventType } from './types.js';

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
}

export function groupIntoEras(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
  opts: EraOptions = {},
): Era[] {
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

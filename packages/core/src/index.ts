import { buildAnalyzedRepo, isCodeFile, isTestFile, yearOf } from './analyzer.js';
import {
  defaultCacheDir,
  deriveRepoName,
  isRemoteUrl,
  readBranches,
  readDefaultBranch,
  readGitLog,
  readTags,
  resolveSource,
} from './git.js';
import { ALL_DETECTORS, runDetectors } from './detectors.js';
import { groupIntoEras } from './eras.js';
import type {
  AnalyzeOptions,
  AnalyzedRepo,
  DetectedEvent,
  Era,
  EvidenceLink,
  ProgressEvent,
  RawCommit,
  Saga,
  TimeTravelSnapshot,
  SagaStats,
} from './types.js';

export const SAGA_GENERATOR_NAME = 'repo-saga';
export const SAGA_GENERATOR_VERSION = '0.1.0';

export async function generateSaga(input: string, opts: AnalyzeOptions = {}): Promise<Saga> {
  const t0 = Date.now();
  const onProgress = opts.onProgress ?? (() => {});

  emit(onProgress, {
    phase: 'init',
    message: `Resolving source: ${input}`,
  });

  const resolved = await resolveSource(input, {
    cacheDir: opts.cacheDir,
    shallow: opts.shallow,
    force: opts.force,
    gitBin: opts.gitBin,
    onProgress: (msg) => emit(onProgress, { phase: isRemoteUrl(input) ? 'clone' : 'init', message: msg }),
  });

  emit(onProgress, { phase: 'git-log', message: 'Reading git history…' });
  const commits = await readGitLog(resolved.resolvedPath, {
    maxCommits: opts.maxCommits,
    gitBin: opts.gitBin,
  });
  emit(onProgress, {
    phase: 'parsing',
    message: `Parsed ${commits.length.toLocaleString()} commits`,
    progress: 0.4,
  });

  const tags = await readTags(resolved.resolvedPath, opts.gitBin);
  await readBranches(resolved.resolvedPath, opts.gitBin); // for future use; ignore output
  const defaultBranch = await readDefaultBranch(resolved.resolvedPath, opts.gitBin);

  emit(onProgress, { phase: 'analysing', message: 'Aggregating yearly stats…', progress: 0.55 });
  const repoName = deriveRepoName(input);
  const analyzed = buildAnalyzedRepo({
    repoName,
    source: input,
    resolvedPath: resolved.resolvedPath,
    commits,
    tags,
    defaultBranch,
  });

  emit(onProgress, {
    phase: 'detecting',
    message: 'Running heuristic detectors…',
    progress: 0.7,
  });
  const { events, ran } = runDetectors(analyzed);

  emit(onProgress, { phase: 'eras', message: 'Carving the timeline into eras…', progress: 0.85 });
  const eras = groupIntoEras(analyzed, events);

  emit(onProgress, { phase: 'rendering', message: 'Compiling saga…', progress: 0.95 });
  const stats = buildSagaStats(analyzed, events);

  const saga: Saga = {
    schemaVersion: 1,
    repo: analyzed.repo,
    eras,
    events,
    stats,
    meta: {
      generator: SAGA_GENERATOR_NAME,
      generatorVersion: SAGA_GENERATOR_VERSION,
      durationMs: Date.now() - t0,
      detectorsRun: ran,
    },
  };

  emit(onProgress, { phase: 'done', message: 'Saga complete.', progress: 1 });
  return saga;
}

export function buildSagaStats(repo: AnalyzedRepo, events: DetectedEvent[] = []): SagaStats {
  const commitsByYear: Record<string, number> = {};
  const insertionsByYear: Record<string, number> = {};
  const deletionsByYear: Record<string, number> = {};
  const contributorsByYear: Record<string, number> = {};
  const testRatioByYear: Record<string, number> = {};
  const languagesByYear: Record<string, Record<string, number>> = {};
  const fileActivityByYear = new Map<string, Map<string, number>>();
  const contributorActivityByYear = new Map<
    string,
    Map<string, { name: string; email: string; commits: number }>
  >();
  const contributorFiles = new Map<string, Map<string, number>>();

  const yearAuthors = new Map<number, Set<string>>();
  for (const c of repo.commits) {
    const y = String(yearOf(c.date));
    commitsByYear[y] = (commitsByYear[y] ?? 0) + 1;
    insertionsByYear[y] = (insertionsByYear[y] ?? 0) + c.insertions;
    deletionsByYear[y] = (deletionsByYear[y] ?? 0) + c.deletions;
    if (c.authorEmail) {
      const yi = Number(y);
      let set = yearAuthors.get(yi);
      if (!set) {
        set = new Set();
        yearAuthors.set(yi, set);
      }
      set.add(c.authorEmail.toLowerCase());
    }
    const contributorKey = contributorKeyFor(c);
    let yearContributors = contributorActivityByYear.get(y);
    if (!yearContributors) {
      yearContributors = new Map();
      contributorActivityByYear.set(y, yearContributors);
    }
    const contributorEntry = yearContributors.get(contributorKey) ?? {
      name: c.authorName,
      email: c.authorEmail,
      commits: 0,
    };
    contributorEntry.name = contributorEntry.name || c.authorName || contributorEntry.email;
    contributorEntry.email = contributorEntry.email || c.authorEmail || contributorKey;
    contributorEntry.commits += 1;
    yearContributors.set(contributorKey, contributorEntry);

    let contributorFileCounts = contributorFiles.get(contributorKey);
    if (!contributorFileCounts) {
      contributorFileCounts = new Map();
      contributorFiles.set(contributorKey, contributorFileCounts);
    }

    for (const f of c.files) {
      let yearFiles = fileActivityByYear.get(y);
      if (!yearFiles) {
        yearFiles = new Map();
        fileActivityByYear.set(y, yearFiles);
      }
      yearFiles.set(f.path, (yearFiles.get(f.path) ?? 0) + 1);
      contributorFileCounts.set(f.path, (contributorFileCounts.get(f.path) ?? 0) + 1);

      const ext = (f.path.split('/').pop() ?? '').split('.').pop()?.toLowerCase();
      if (!ext) continue;
      if (!isCodeFile(f.path) && !isTestFile(f.path)) continue;
      let langMap = languagesByYear[y];
      if (!langMap) {
        langMap = {};
        languagesByYear[y] = langMap;
      }
      langMap[ext] = (langMap[ext] ?? 0) + f.insertions;
    }
  }
  for (const [yi, set] of yearAuthors) contributorsByYear[String(yi)] = set.size;

  for (const y of repo.yearly) {
    const total = y.codeInsertions + y.testInsertions;
    testRatioByYear[String(y.year)] = total > 0 ? y.testInsertions / total : 0;
  }

  const topContributors = repo.contributors.slice(0, 10).map((c) => ({
    name: c.name,
    email: c.email,
    commits: c.commits,
  }));

  const activeFilesByYear = Object.fromEntries(
    [...fileActivityByYear.entries()].map(([year, files]) => [
      year,
      [...files.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([file]) => file),
    ]),
  );

  const activeContributorsByYear = Object.fromEntries(
    [...contributorActivityByYear.entries()].map(([year, contributors]) => [
      year,
      [...contributors.values()]
        .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name))
        .slice(0, 10),
    ]),
  );

  const activeDetectorEventsByYear = buildActiveDetectorEventsByYear(repo, events);
  const timeTravelSnapshots = buildTimeTravelSnapshots(repo, events);
  const evidenceLinks = buildEvidenceLinks(repo, events);
  const contributorTimeline = Object.fromEntries(
    repo.contributors.slice(0, 40).map((contributor) => {
      const key = contributorKeyFor({
        authorEmail: contributor.email,
        authorName: contributor.name,
      });
      const commitsByYear: Record<string, number> = {};
      for (const commit of repo.commits) {
        if (contributorKeyFor(commit) !== key) continue;
        const y = String(yearOf(commit.date));
        commitsByYear[y] = (commitsByYear[y] ?? 0) + 1;
      }
      const topFiles = [...(contributorFiles.get(key)?.entries() ?? [])]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([file]) => file);
      return [
        key,
        {
          name: contributor.name,
          email: contributor.email,
          firstYear: yearOf(contributor.firstSeen),
          lastYear: yearOf(contributor.lastSeen),
          commitsByYear,
          topFiles,
        },
      ];
    }),
  );

  return {
    commitsByYear,
    insertionsByYear,
    deletionsByYear,
    contributorsByYear,
    testRatioByYear,
    languagesByYear,
    topContributors,
    activeFilesByYear,
    activeContributorsByYear,
    activeDetectorEventsByYear,
    timeTravelSnapshots,
    evidenceLinks,
    contributorTimeline,
  };
}

function buildTimeTravelSnapshots(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
): TimeTravelSnapshot[] {
  if (repo.commits.length === 0) return [];

  const commits = [...repo.commits]
    .map((commit) => ({ commit, day: utcDayMs(commit.date) }))
    .filter((entry) => Number.isFinite(entry.day))
    .sort((a, b) => a.day - b.day);
  if (commits.length === 0) return [];

  const firstDay = utcDayMs(repo.repo.firstCommitDate) || commits[0].day;
  const lastDay = utcDayMs(repo.repo.lastCommitDate) || commits[commits.length - 1].day;
  const fileCounts = new Map<string, number>();
  const contributorCounts = new Map<string, { name: string; email: string; commits: number }>();
  const snapshots: TimeTravelSnapshot[] = [];
  let left = 0;
  let right = 0;
  let commitCount = 0;

  for (let day = firstDay; day <= lastDay; day += DAY_MS) {
    const windowStart = day - 30 * DAY_MS;
    const windowEnd = day + 30 * DAY_MS;

    while (right < commits.length && commits[right].day <= windowEnd) {
      addCommitToWindow(commits[right].commit, fileCounts, contributorCounts);
      commitCount += 1;
      right += 1;
    }

    while (left < right && commits[left].day < windowStart) {
      removeCommitFromWindow(commits[left].commit, fileCounts, contributorCounts);
      commitCount -= 1;
      left += 1;
    }

    snapshots.push({
      date: shortDate(new Date(day).toISOString()),
      windowStart: shortDate(new Date(windowStart).toISOString()),
      windowEnd: shortDate(new Date(windowEnd).toISOString()),
      commits: commitCount,
      activeFiles: topKeys(fileCounts, 10),
      activeContributors: [...contributorCounts.values()]
        .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name))
        .slice(0, 10),
      activeDetectorEvents: events
        .filter((event) => eventOverlapsWindow(event, windowStart, windowEnd))
        .sort((a, b) => b.score - a.score)
        .map((event) => event.id),
    });
  }

  return snapshots;
}

function buildActiveDetectorEventsByYear(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
): Record<string, string[]> {
  const years = yearsInRepo(repo);
  const output: Record<string, string[]> = {};
  for (const year of years) {
    output[String(year)] = events
      .filter((event) => event.startYear <= year && event.endYear >= year)
      .sort((a, b) => b.score - a.score)
      .map((event) => event.id);
  }
  return output;
}

const DAY_MS = 86_400_000;

function utcDayMs(iso: string): number {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return Number.NaN;
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function addCommitToWindow(
  commit: RawCommit,
  fileCounts: Map<string, number>,
  contributorCounts: Map<string, { name: string; email: string; commits: number }>,
) {
  const key = contributorKeyFor(commit);
  const contributor = contributorCounts.get(key) ?? {
    name: commit.authorName,
    email: commit.authorEmail,
    commits: 0,
  };
  contributor.commits += 1;
  contributorCounts.set(key, contributor);
  for (const file of commit.files) {
    fileCounts.set(file.path, (fileCounts.get(file.path) ?? 0) + 1);
  }
}

function removeCommitFromWindow(
  commit: RawCommit,
  fileCounts: Map<string, number>,
  contributorCounts: Map<string, { name: string; email: string; commits: number }>,
) {
  const key = contributorKeyFor(commit);
  const contributor = contributorCounts.get(key);
  if (contributor) {
    contributor.commits -= 1;
    if (contributor.commits <= 0) contributorCounts.delete(key);
  }
  for (const file of commit.files) {
    const next = (fileCounts.get(file.path) ?? 0) - 1;
    if (next <= 0) fileCounts.delete(file.path);
    else fileCounts.set(file.path, next);
  }
}

function topKeys(map: Map<string, number>, limit: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function eventOverlapsWindow(event: DetectedEvent, windowStart: number, windowEnd: number): boolean {
  const eventStart = utcDayMs(event.startDate);
  const eventEnd = utcDayMs(event.endDate);
  if (Number.isFinite(eventStart) && Number.isFinite(eventEnd)) {
    return eventEnd >= windowStart && eventStart <= windowEnd;
  }
  const start = Date.UTC(event.startYear, 0, 1);
  const end = Date.UTC(event.endYear, 11, 31);
  return end >= windowStart && start <= windowEnd;
}

function buildEvidenceLinks(
  repo: AnalyzedRepo,
  events: DetectedEvent[],
): Record<string, EvidenceLink[]> {
  const remote = githubRemote(repo.repo.source);
  const output: Record<string, EvidenceLink[]> = {};
  for (const event of events) {
    const commitsInEvent = repo.commits.filter((commit) => isCommitInEvent(commit, event));
    const hashes = hashesFromEvidence(event.evidence);
    const links: EvidenceLink[] = [];
    const evidenceFiles = filesFromEvidence(event.evidence, repo);
    if (remote) {
      for (const hash of hashes.slice(0, 3)) {
        links.push({ label: `commit ${hash}`, url: `${remote}/commit/${hash}`, kind: 'commit' });
      }
      if (event.startDate && event.endDate && event.startDate !== event.endDate) {
        links.push({
          label: `${shortDate(event.startDate)}…${shortDate(event.endDate)}`,
          url: `${remote}/commits?since=${encodeURIComponent(shortDate(event.startDate))}&until=${encodeURIComponent(shortDate(event.endDate))}`,
          kind: 'search',
        });
      }
      for (const file of evidenceFiles.slice(0, 3)) {
        links.push({
          label: file,
          url: `${remote}/commits?path=${encodeURIComponent(file)}`,
          kind: 'file',
        });
      }
    }

    if (links.length === 0) {
      for (const commit of commitsInEvent.slice(0, 3)) {
        links.push({
          label: `${commit.shortHash} ${commit.subject}`,
          url: `repo-saga://commit/${commit.hash}`,
          kind: 'commit',
        });
      }
      for (const file of evidenceFiles.slice(0, 3)) {
        links.push({
          label: file,
          url: `repo-saga://file/${encodeURIComponent(file)}`,
          kind: 'file',
        });
      }
    }
    output[event.id] = dedupeLinks(links).slice(0, 5);
  }
  return output;
}

function yearsInRepo(repo: AnalyzedRepo): number[] {
  const fromStats = repo.yearly.map((entry) => entry.year);
  if (fromStats.length > 0) return fromStats;
  const first = yearOf(repo.repo.firstCommitDate);
  const last = yearOf(repo.repo.lastCommitDate);
  const years: number[] = [];
  for (let year = first; year <= last; year++) years.push(year);
  return years;
}

function contributorKeyFor(value: Pick<RawCommit, 'authorEmail' | 'authorName'>): string {
  return (value.authorEmail || value.authorName || 'unknown').toLowerCase();
}

function isCommitInEvent(commit: RawCommit, event: DetectedEvent): boolean {
  const time = new Date(commit.date).getTime();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  if (Number.isFinite(start) && Number.isFinite(end)) return time >= start && time <= end;
  const year = yearOf(commit.date);
  return year >= event.startYear && year <= event.endYear;
}

function githubRemote(source: string): string | undefined {
  const trimmed = source.trim().replace(/\.git$/i, '').replace(/\/+$/g, '');
  const https = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[#?].*)?$/i);
  if (https) return `https://github.com/${https[1]}/${https[2]}`;
  const ssh = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s#?]+)$/i);
  if (ssh) return `https://github.com/${ssh[1]}/${ssh[2]}`;
  return undefined;
}

function hashesFromEvidence(evidence: string[]): string[] {
  const hashes = new Set<string>();
  for (const item of evidence) {
    const matches = item.match(/\b[0-9a-f]{7,40}\b/gi) ?? [];
    for (const match of matches) hashes.add(match);
  }
  return [...hashes];
}

function filesFromEvidence(evidence: string[], repo: AnalyzedRepo): string[] {
  const files = new Set<string>();
  const knownPaths = new Set([...Object.keys(repo.firstSeen), ...Object.keys(repo.lastSeen)]);
  for (const item of evidence) {
    for (const match of item.matchAll(/\b(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\b/g)) {
      addIfKnownPath(files, match[0], knownPaths);
    }
    const parenthetical = item.match(/\(([^)]+\.[A-Za-z0-9]+)\)/);
    if (parenthetical) addIfKnownPath(files, parenthetical[1], knownPaths);
  }
  return [...files];
}

function addIfKnownPath(files: Set<string>, candidate: string, knownPaths: Set<string>) {
  const normalized = candidate.replace(/^`|`$/g, '');
  if (knownPaths.has(normalized)) files.add(normalized);
}

function dedupeLinks(links: EvidenceLink[]): EvidenceLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.kind}:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function emit(cb: (e: ProgressEvent) => void, e: ProgressEvent) {
  try {
    cb(e);
  } catch {
    /* swallow callback errors */
  }
}

export {
  ALL_DETECTORS,
  buildAnalyzedRepo,
  defaultCacheDir,
  deriveRepoName,
  groupIntoEras,
  isRemoteUrl,
  readBranches,
  readDefaultBranch,
  readGitLog,
  readTags,
  resolveSource,
  runDetectors,
};
export * from './types.js';
export type { Detector } from './detectors.js';
export type { AnalyzedRepo, DetectedEvent, Era };

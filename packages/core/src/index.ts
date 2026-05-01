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
  ProgressEvent,
  Saga,
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
  const stats = buildSagaStats(analyzed);

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

function buildSagaStats(repo: AnalyzedRepo): SagaStats {
  const commitsByYear: Record<string, number> = {};
  const insertionsByYear: Record<string, number> = {};
  const deletionsByYear: Record<string, number> = {};
  const contributorsByYear: Record<string, number> = {};
  const testRatioByYear: Record<string, number> = {};
  const languagesByYear: Record<string, Record<string, number>> = {};

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
    for (const f of c.files) {
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

  return {
    commitsByYear,
    insertionsByYear,
    deletionsByYear,
    contributorsByYear,
    testRatioByYear,
    languagesByYear,
    topContributors,
  };
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

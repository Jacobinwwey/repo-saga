/**
 * Shared types for repo-saga.
 * The schema is intentionally JSON-friendly so it can round-trip through
 * the file system, the local server, and the web UI without transformations.
 */

export interface RepoSource {
  /** human-friendly project name (last path segment) */
  name: string;
  /** original URL or local path the user supplied */
  source: string;
  /** absolute on-disk path that was actually analysed */
  resolvedPath: string;
  /** ISO 8601 timestamp of when analysis finished */
  analyzedAt: string;
  /** total number of commits processed */
  commitCount: number;
  /** ISO 8601 date of the first commit */
  firstCommitDate: string;
  /** ISO 8601 date of the most recent commit */
  lastCommitDate: string;
  /** distinct contributor count (by email) */
  contributors: number;
  /** active branch at analysis time, if known */
  defaultBranch?: string;
  /** total tags found */
  tagCount: number;
  /** optional display label for the first rendered timeline period */
  firstPeriodLabel?: string;
  /** optional display label for the last rendered timeline period */
  lastPeriodLabel?: string;
  /** timeline slicing mode used to build eras */
  timelineGranularity?: TimelineGranularity;
}

export interface RawCommit {
  hash: string;
  shortHash: string;
  date: string;
  authorName: string;
  authorEmail: string;
  subject: string;
  body?: string;
  parents: string[];
  insertions: number;
  deletions: number;
  /** files added/modified/deleted in this commit */
  files: CommitFileChange[];
}

export interface CommitFileChange {
  path: string;
  /** previous path on rename, undefined otherwise */
  oldPath?: string;
  insertions: number;
  deletions: number;
  /** added | modified | deleted | renamed | binary */
  status: FileStatus;
}

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'binary';

export interface RawTag {
  name: string;
  date?: string;
  hash?: string;
}

export interface YearlyStats {
  year: number;
  commits: number;
  insertions: number;
  deletions: number;
  authors: number;
  filesTouched: number;
  testFiles: number;
  testInsertions: number;
  codeFiles: number;
  codeInsertions: number;
}

export interface LanguageStats {
  /** key is file extension without dot, value is byte-equivalent insertions */
  byExtension: Record<string, number>;
  topLanguages: Array<{ extension: string; share: number }>;
}

export interface ContributorStats {
  email: string;
  name: string;
  firstSeen: string;
  lastSeen: string;
  commits: number;
  insertions: number;
  deletions: number;
}

export interface AnalyzedRepo {
  repo: RepoSource;
  commits: RawCommit[];
  tags: RawTag[];
  contributors: ContributorStats[];
  yearly: YearlyStats[];
  languages: LanguageStats;
  /** quick lookup: file path -> first appearance commit date */
  firstSeen: Record<string, string>;
  /** quick lookup: file path -> last appearance commit date */
  lastSeen: Record<string, string>;
  /** index of "important" files we always look at */
  signalFiles: SignalFile[];
}

export interface SignalFile {
  path: string;
  kind: SignalFileKind;
  firstSeen: string;
  lastSeen: string;
  /** approximate count of changes */
  changes: number;
}

export type SignalFileKind =
  | 'tsconfig'
  | 'package-json'
  | 'pyproject'
  | 'requirements'
  | 'go-mod'
  | 'cargo'
  | 'pom'
  | 'gradle'
  | 'dockerfile'
  | 'docker-compose'
  | 'github-workflow'
  | 'gitlab-ci'
  | 'eslint'
  | 'prettier'
  | 'biome'
  | 'ruff'
  | 'husky'
  | 'lint-staged'
  | 'pnpm-workspace'
  | 'turbo'
  | 'nx'
  | 'lerna'
  | 'lockfile'
  | 'k8s'
  | 'helm'
  | 'terraform'
  | 'jest'
  | 'vitest'
  | 'playwright'
  | 'cypress'
  | 'mocha';

export type EventType =
  | 'initial-chaos'
  | 'typescript-invasion'
  | 'great-refactor-war'
  | 'testing-famine'
  | 'testing-renaissance'
  | 'linting-theocracy'
  | 'container-empire'
  | 'monorepo-federation'
  | 'dependency-cataclysm'
  | 'founder-exodus'
  | 'new-dynasty'
  | 'ai-priesthood'
  | 'bug-plague'
  | 'release-empire';

export type EventSeverity = 'minor' | 'notable' | 'major' | 'epoch-defining';

export interface DetectedEvent {
  id: string;
  type: EventType;
  title: string;
  /** ISO date or year string for the start of the event */
  startDate: string;
  /** ISO date or year string for the end (may equal startDate) */
  endDate: string;
  startYear: number;
  endYear: number;
  /** optional display label used instead of startYear for rendered ranges */
  displayStartLabel?: string;
  /** optional display label used instead of endYear for rendered ranges */
  displayEndLabel?: string;
  severity: EventSeverity;
  /** 0..1 — heuristic confidence */
  confidence: number;
  /** short, human-readable narrative */
  narrative: string;
  /** array of bullet-style evidence strings */
  evidence: string[];
  /** Why this detector emitted the event, expressed as UI-friendly telemetry. */
  debug?: DetectorDebugInfo;
  /** sortable score: confidence * severity weight */
  score: number;
}

export interface DetectorDebugInfo {
  /** detector that produced this event */
  detector: EventType;
  /** concise positive rule that was satisfied */
  positive: string;
  /** optional nearby miss/threshold gap for explaining non-events */
  negative?: string;
  /** key threshold facts surfaced in the UI */
  metrics: DetectorDebugMetric[];
}

export interface DetectorDebugMetric {
  label: string;
  value: string | number;
  threshold?: string | number;
  delta?: string | number;
}

export interface EvidenceLink {
  label: string;
  url: string;
  kind: 'commit' | 'compare' | 'search' | 'file';
}

export interface Era {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  /** optional real start date for this era when using non-year timeline slicing */
  startDate?: string;
  /** optional real end date for this era when using non-year timeline slicing */
  endDate?: string;
  /** optional display label used instead of startYear for rendered ranges */
  displayStartLabel?: string;
  /** optional display label used instead of endYear for rendered ranges */
  displayEndLabel?: string;
  theme: string;
  summary: string;
  /** Raw numbers used to (re)compose era.summary in any language. */
  summaryStats: {
    commits: number;
    contributors: number;
    insertions: number;
    deletions: number;
  };
  dominantEvents: string[];
  /**
   * The event chosen at era-build time to provide this era's name profile
   * (e.g. "Migration Era: TypeScript Invasion"). At most one era references
   * any given event, so renderers/translators must honor this rather than
   * reselect a lead from `dominantEvents` (which would duplicate names across
   * eras for long-running events).
   */
  leadEventId?: string;
  evidence: string[];
}

export interface SagaStats {
  commitsByYear: Record<string, number>;
  insertionsByYear: Record<string, number>;
  deletionsByYear: Record<string, number>;
  contributorsByYear: Record<string, number>;
  testRatioByYear: Record<string, number>;
  languagesByYear: Record<string, Record<string, number>>;
  topContributors: Array<{ name: string; email: string; commits: number }>;
  activeFilesByYear?: Record<string, string[]>;
  activeContributorsByYear?: Record<string, Array<{ name: string; email: string; commits: number }>>;
  activeDetectorEventsByYear?: Record<string, string[]>;
  timeTravelSnapshots?: TimeTravelSnapshot[];
  evidenceLinks?: Record<string, EvidenceLink[]>;
  contributorTimeline?: Record<
    string,
    {
      name: string;
      email: string;
      firstYear: number;
      lastYear: number;
      commitsByYear: Record<string, number>;
      topFiles: string[];
    }
  >;
}

export interface TimeTravelSnapshot {
  /** ISO date (YYYY-MM-DD) at the centre of the ±30 day window. */
  date: string;
  windowStart: string;
  windowEnd: string;
  commits: number;
  activeFiles: string[];
  activeContributors: Array<{ name: string; email: string; commits: number }>;
  activeDetectorEvents: string[];
}

export interface Saga {
  /** schema version of the saga.json output */
  schemaVersion: 1;
  repo: RepoSource;
  eras: Era[];
  events: DetectedEvent[];
  stats: SagaStats;
  /** generation metadata */
  meta: {
    generator: string;
    generatorVersion: string;
    durationMs: number;
    detectorsRun: string[];
  };
}

export interface ProgressEvent {
  phase:
    | 'init'
    | 'clone'
    | 'git-log'
    | 'parsing'
    | 'analysing'
    | 'detecting'
    | 'eras'
    | 'rendering'
    | 'done'
    | 'error';
  message: string;
  /** 0..1 if known, undefined if indeterminate */
  progress?: number;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export interface AnalyzeOptions {
  /** maximum number of commits to read (default = unlimited) */
  maxCommits?: number;
  /** progress reporting hook */
  onProgress?: ProgressCallback;
  /** path used when cloning remotes (default = OS tmpdir/.repo-saga-cache) */
  cacheDir?: string;
  /** when cloning, request a shallow clone (faster but with less history) */
  shallow?: boolean;
  /** force re-clone even if cached copy exists */
  force?: boolean;
  /** accept a custom git binary (defaults to PATH 'git') */
  gitBin?: string;
  /** timeline slicing mode used when carving eras (default year) */
  timelineGranularity?: TimelineGranularity;
  /** custom bucket size in days when timelineGranularity = 'days' */
  bucketDays?: number;
}

export type TimelineGranularity = 'year' | 'quarter' | 'month' | 'days';

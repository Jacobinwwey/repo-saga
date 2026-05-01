import type {
  AnalyzedRepo,
  ContributorStats,
  LanguageStats,
  RawCommit,
  RawTag,
  RepoSource,
  SignalFile,
  SignalFileKind,
  YearlyStats,
} from './types.js';

export interface BuildAnalyzedRepoInput {
  repoName: string;
  source: string;
  resolvedPath: string;
  commits: RawCommit[];
  tags: RawTag[];
  defaultBranch?: string;
}

export function buildAnalyzedRepo(input: BuildAnalyzedRepoInput): AnalyzedRepo {
  // Sort oldest first for incremental analysis.
  const commits = [...input.commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const repoSource: RepoSource = {
    name: input.repoName,
    source: input.source,
    resolvedPath: input.resolvedPath,
    analyzedAt: new Date().toISOString(),
    commitCount: commits.length,
    firstCommitDate: commits[0]?.date ?? new Date().toISOString(),
    lastCommitDate: commits[commits.length - 1]?.date ?? new Date().toISOString(),
    contributors: countDistinctEmails(commits),
    defaultBranch: input.defaultBranch,
    tagCount: input.tags.length,
  };

  const yearly = aggregateYearly(commits);
  const languages = aggregateLanguages(commits);
  const { firstSeen, lastSeen } = buildSeenMaps(commits);
  const contributors = buildContributorStats(commits);
  const signalFiles = detectSignalFiles(firstSeen, lastSeen, commits);

  return {
    repo: repoSource,
    commits,
    tags: input.tags,
    contributors,
    yearly,
    languages,
    firstSeen,
    lastSeen,
    signalFiles,
  };
}

function countDistinctEmails(commits: RawCommit[]): number {
  const set = new Set<string>();
  for (const c of commits) {
    if (c.authorEmail) set.add(c.authorEmail.toLowerCase());
  }
  return set.size;
}

export function yearOf(isoDate: string): number {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return new Date().getFullYear();
  return d.getUTCFullYear();
}

function aggregateYearly(commits: RawCommit[]): YearlyStats[] {
  const map = new Map<number, YearlyStats>();
  const yearAuthors = new Map<number, Set<string>>();
  const yearFiles = new Map<number, Set<string>>();

  for (const c of commits) {
    const y = yearOf(c.date);
    let entry = map.get(y);
    if (!entry) {
      entry = {
        year: y,
        commits: 0,
        insertions: 0,
        deletions: 0,
        authors: 0,
        filesTouched: 0,
        testFiles: 0,
        testInsertions: 0,
        codeFiles: 0,
        codeInsertions: 0,
      };
      map.set(y, entry);
      yearAuthors.set(y, new Set());
      yearFiles.set(y, new Set());
    }
    entry.commits += 1;
    entry.insertions += c.insertions;
    entry.deletions += c.deletions;
    if (c.authorEmail) yearAuthors.get(y)!.add(c.authorEmail.toLowerCase());
    for (const f of c.files) {
      yearFiles.get(y)!.add(f.path);
      const isTest = isTestFile(f.path);
      const isCode = isCodeFile(f.path);
      if (isTest) {
        entry.testFiles += 1;
        entry.testInsertions += f.insertions;
      } else if (isCode) {
        entry.codeFiles += 1;
        entry.codeInsertions += f.insertions;
      }
    }
  }

  for (const [y, stats] of map) {
    stats.authors = yearAuthors.get(y)?.size ?? 0;
    stats.filesTouched = yearFiles.get(y)?.size ?? 0;
  }

  return [...map.values()].sort((a, b) => a.year - b.year);
}

const TEST_PATH_HINTS = [
  /(^|\/)tests?\//i,
  /(^|\/)__tests__\//i,
  /(^|\/)spec\//i,
  /\.test\.[a-z0-9]+$/i,
  /\.spec\.[a-z0-9]+$/i,
  /_test\.[a-z0-9]+$/i,
  /_spec\.[a-z0-9]+$/i,
];

const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'kts',
  'scala',
  'cs',
  'fs',
  'cpp',
  'c',
  'cc',
  'h',
  'hpp',
  'm',
  'mm',
  'swift',
  'php',
  'lua',
  'dart',
  'ex',
  'exs',
  'erl',
  'hs',
  'ml',
  'clj',
  'cljs',
  'sh',
  'bash',
  'zsh',
  'sql',
  'svelte',
  'vue',
  'astro',
]);

export function isTestFile(filePath: string): boolean {
  return TEST_PATH_HINTS.some((re) => re.test(filePath));
}

export function isCodeFile(filePath: string): boolean {
  const ext = extensionOf(filePath);
  if (!ext) return false;
  return CODE_EXTENSIONS.has(ext);
}

export function extensionOf(filePath: string): string | undefined {
  const base = filePath.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return undefined;
  return base.slice(dot + 1).toLowerCase();
}

function aggregateLanguages(commits: RawCommit[]): LanguageStats {
  const byExt: Record<string, number> = {};
  let total = 0;
  for (const c of commits) {
    for (const f of c.files) {
      const ext = extensionOf(f.path);
      if (!ext) continue;
      if (!CODE_EXTENSIONS.has(ext)) continue;
      byExt[ext] = (byExt[ext] ?? 0) + f.insertions;
      total += f.insertions;
    }
  }
  const topLanguages = Object.entries(byExt)
    .map(([extension, weight]) => ({
      extension,
      share: total > 0 ? weight / total : 0,
    }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 10);
  return { byExtension: byExt, topLanguages };
}

function buildSeenMaps(commits: RawCommit[]): {
  firstSeen: Record<string, string>;
  lastSeen: Record<string, string>;
} {
  const firstSeen: Record<string, string> = {};
  const lastSeen: Record<string, string> = {};
  for (const c of commits) {
    for (const f of c.files) {
      if (!firstSeen[f.path]) firstSeen[f.path] = c.date;
      lastSeen[f.path] = c.date;
    }
  }
  return { firstSeen, lastSeen };
}

function buildContributorStats(commits: RawCommit[]): ContributorStats[] {
  const map = new Map<string, ContributorStats>();
  for (const c of commits) {
    const key = (c.authorEmail || c.authorName || 'unknown').toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = {
        email: c.authorEmail || key,
        name: c.authorName || key,
        firstSeen: c.date,
        lastSeen: c.date,
        commits: 0,
        insertions: 0,
        deletions: 0,
      };
      map.set(key, entry);
    }
    entry.commits += 1;
    entry.insertions += c.insertions;
    entry.deletions += c.deletions;
    if (new Date(c.date) < new Date(entry.firstSeen)) entry.firstSeen = c.date;
    if (new Date(c.date) > new Date(entry.lastSeen)) entry.lastSeen = c.date;
  }
  return [...map.values()].sort((a, b) => b.commits - a.commits);
}

interface SignalRule {
  kind: SignalFileKind;
  test: (path: string) => boolean;
}

const SIGNAL_RULES: SignalRule[] = [
  { kind: 'tsconfig', test: (p) => /(^|\/)tsconfig(\.[^/]+)?\.json$/i.test(p) },
  { kind: 'package-json', test: (p) => /(^|\/)package\.json$/i.test(p) },
  { kind: 'pyproject', test: (p) => /(^|\/)pyproject\.toml$/i.test(p) },
  { kind: 'requirements', test: (p) => /(^|\/)requirements(\.[^/]+)?\.txt$/i.test(p) },
  { kind: 'go-mod', test: (p) => /(^|\/)go\.(mod|sum)$/i.test(p) },
  { kind: 'cargo', test: (p) => /(^|\/)Cargo\.(toml|lock)$/i.test(p) },
  { kind: 'pom', test: (p) => /(^|\/)pom\.xml$/i.test(p) },
  { kind: 'gradle', test: (p) => /(^|\/)build\.gradle(\.kts)?$/i.test(p) },
  { kind: 'dockerfile', test: (p) => /(^|\/)Dockerfile([._-][^/]*)?$/i.test(p) },
  { kind: 'docker-compose', test: (p) => /(^|\/)docker-compose(\.[^/]+)?\.ya?ml$/i.test(p) },
  { kind: 'github-workflow', test: (p) => /(^|\/)\.github\/workflows\//i.test(p) },
  { kind: 'gitlab-ci', test: (p) => /(^|\/)\.gitlab-ci\.ya?ml$/i.test(p) },
  { kind: 'eslint', test: (p) => /(^|\/)(\.eslintrc[^/]*|eslint\.config\.[mc]?[jt]s)$/i.test(p) },
  { kind: 'prettier', test: (p) => /(^|\/)(\.prettierrc[^/]*|prettier\.config\.[mc]?[jt]s)$/i.test(p) },
  { kind: 'biome', test: (p) => /(^|\/)biome\.json$/i.test(p) },
  { kind: 'ruff', test: (p) => /(^|\/)(ruff\.toml|\.ruff\.toml)$/i.test(p) },
  { kind: 'husky', test: (p) => /(^|\/)\.husky\//i.test(p) },
  {
    kind: 'lint-staged',
    test: (p) => /(^|\/)(\.lintstagedrc[^/]*|lint-staged\.config\.[mc]?[jt]s)$/i.test(p),
  },
  { kind: 'pnpm-workspace', test: (p) => /(^|\/)pnpm-workspace\.ya?ml$/i.test(p) },
  { kind: 'turbo', test: (p) => /(^|\/)turbo\.json$/i.test(p) },
  { kind: 'nx', test: (p) => /(^|\/)nx\.json$/i.test(p) },
  { kind: 'lerna', test: (p) => /(^|\/)lerna\.json$/i.test(p) },
  {
    kind: 'lockfile',
    test: (p) =>
      /(^|\/)(package-lock\.json|pnpm-lock\.ya?ml|yarn\.lock|poetry\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock)$/i.test(
        p,
      ),
  },
  { kind: 'k8s', test: (p) => /(^|\/)k8s\//i.test(p) || /\.ya?ml$/i.test(p) && /(deployment|service|ingress|kustomization)/i.test(p) },
  { kind: 'helm', test: (p) => /(^|\/)Chart\.ya?ml$/i.test(p) || /(^|\/)helm\//i.test(p) },
  { kind: 'terraform', test: (p) => /\.(tf|tfvars)$/i.test(p) },
  { kind: 'jest', test: (p) => /(^|\/)jest\.config\.[mc]?[jt]s$/i.test(p) },
  { kind: 'vitest', test: (p) => /(^|\/)vitest\.config\.[mc]?[jt]s$/i.test(p) },
  { kind: 'playwright', test: (p) => /(^|\/)playwright\.config\.[mc]?[jt]s$/i.test(p) },
  { kind: 'cypress', test: (p) => /(^|\/)cypress\.config\.[mc]?[jt]s$/i.test(p) || /(^|\/)cypress\//i.test(p) },
  { kind: 'mocha', test: (p) => /(^|\/)\.mocharc(\.[^/]+)?$/i.test(p) },
];

export function classifyPath(filePath: string): SignalFileKind | undefined {
  for (const rule of SIGNAL_RULES) {
    if (rule.test(filePath)) return rule.kind;
  }
  return undefined;
}

function detectSignalFiles(
  firstSeen: Record<string, string>,
  lastSeen: Record<string, string>,
  commits: RawCommit[],
): SignalFile[] {
  // Count changes per signal-relevant path.
  const changes = new Map<string, number>();
  for (const c of commits) {
    for (const f of c.files) {
      changes.set(f.path, (changes.get(f.path) ?? 0) + 1);
    }
  }
  const result: SignalFile[] = [];
  for (const [path, first] of Object.entries(firstSeen)) {
    const kind = classifyPath(path);
    if (!kind) continue;
    result.push({
      path,
      kind,
      firstSeen: first,
      lastSeen: lastSeen[path] ?? first,
      changes: changes.get(path) ?? 1,
    });
  }
  return result.sort((a, b) => new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime());
}

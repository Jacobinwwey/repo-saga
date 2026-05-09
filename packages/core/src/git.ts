import { execa } from 'execa';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { createHash } from 'node:crypto';
import type { CommitFileChange, FileStatus, RawCommit, RawTag } from './types.js';

const SAGA_BEGIN = '__SAGA_BEGIN__';
const SAGA_END = '__SAGA_END__';

const FORMAT = [
  SAGA_BEGIN,
  '%H',
  '%h',
  '%aI',
  '%an',
  '%ae',
  '%P',
  '%s',
  '%b',
  SAGA_END,
].join('%n');

export interface ResolveOptions {
  cacheDir?: string;
  shallow?: boolean;
  force?: boolean;
  gitBin?: string;
  onProgress?: (msg: string) => void;
}

export interface ResolveResult {
  resolvedPath: string;
  source: string;
  isClone: boolean;
}

const URL_PATTERNS = [
  /^https?:\/\//i,
  /^git(\+ssh)?:\/\//i,
  /^ssh:\/\//i,
  /^git@[^:]+:/i,
];

export function isRemoteUrl(input: string): boolean {
  if (!input) return false;
  return URL_PATTERNS.some((p) => p.test(input));
}

export function deriveRepoName(input: string): string {
  let s = input.replace(/[#?].*$/, '').replace(/\/+$/, '').replace(/\.git$/i, '');
  if (/^git@[^:]+:/i.test(s)) {
    s = s.split(':').pop() ?? s;
  }
  const segments = s.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return last && last.length > 0 ? last : 'repo';
}

export async function readPreferredRepoName(
  repoPath: string,
  input: string,
  gitBin: string = 'git',
): Promise<string> {
  if (isRemoteUrl(input)) return deriveRepoName(input);

  const originUrl = await readRemoteUrl(repoPath, 'origin', gitBin);
  if (originUrl) return deriveRepoName(originUrl);

  const remotes = await readRemoteNames(repoPath, gitBin);
  for (const remote of remotes) {
    const remoteUrl = await readRemoteUrl(repoPath, remote, gitBin);
    if (remoteUrl) return deriveRepoName(remoteUrl);
  }

  return deriveRepoName(input);
}

export function defaultCacheDir(): string {
  return path.join(os.tmpdir(), 'repo-saga-cache');
}

export async function resolveSource(
  input: string,
  opts: ResolveOptions = {},
): Promise<ResolveResult> {
  const gitBin = opts.gitBin ?? 'git';

  if (isRemoteUrl(input)) {
    const cacheRoot = opts.cacheDir ?? defaultCacheDir();
    await fs.mkdir(cacheRoot, { recursive: true });
    const slug = createHash('sha1').update(input).digest('hex').slice(0, 16);
    const targetDir = path.join(cacheRoot, slug);
    const exists = await pathIsDir(targetDir);
    let shouldClone = !exists || Boolean(opts.force);

    if (exists && opts.force) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }

    if (exists && !opts.force && !(await isGitWorkTree(gitBin, targetDir))) {
      opts.onProgress?.(`Discarding invalid cached clone at ${targetDir}`);
      await fs.rm(targetDir, { recursive: true, force: true });
      shouldClone = true;
    }

    if (shouldClone) {
      opts.onProgress?.(`Cloning ${input} into cache…`);
      const args = ['clone', '--quiet'];
      if (opts.shallow) args.push('--depth', '1000');
      args.push(input, targetDir);
      try {
        await execa(gitBin, args, { timeout: 10 * 60_000 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`git clone failed: ${msg}`);
      }
    } else {
      opts.onProgress?.(`Refreshing cached clone at ${targetDir}`);
      await refreshCachedClone(gitBin, targetDir);
    }

    return { resolvedPath: targetDir, source: input, isClone: true };
  }

  const abs = path.resolve(input);
  if (!(await pathExists(abs))) {
    throw new Error(`Path does not exist: ${abs}`);
  }
  try {
    await execa(gitBin, ['rev-parse', '--git-dir'], { cwd: abs });
  } catch {
    throw new Error(`Not a git repository: ${abs}`);
  }
  return { resolvedPath: abs, source: input, isClone: false };
}

export async function readGitLog(
  repoPath: string,
  opts: { maxCommits?: number; gitBin?: string } = {},
): Promise<RawCommit[]> {
  const gitBin = opts.gitBin ?? 'git';
  const args: string[] = ['log'];
  if (opts.maxCommits && opts.maxCommits > 0) {
    args.push('-n', String(opts.maxCommits));
  }
  args.push(`--format=${FORMAT}`, '--numstat', '--no-color');

  const { stdout } = await execa(gitBin, args, {
    cwd: repoPath,
    maxBuffer: 1024 * 1024 * 1024, // 1 GB ceiling
    encoding: 'utf8',
  });

  return parseGitLog(stdout);
}

async function isGitWorkTree(gitBin: string, repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execa(gitBin, ['-C', repoPath, 'rev-parse', '--is-inside-work-tree']);
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function refreshCachedClone(gitBin: string, repoPath: string): Promise<void> {
  try {
    await execa(gitBin, ['-C', repoPath, 'fetch', '--quiet', '--tags', '--prune'], {
      timeout: 10 * 60_000,
    });
    await execa(gitBin, ['-C', repoPath, 'pull', '--ff-only', '--quiet'], {
      timeout: 10 * 60_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git cache refresh failed: ${msg}`);
  }
}

export function parseGitLog(stdout: string): RawCommit[] {
  if (!stdout) return [];
  const commits: RawCommit[] = [];
  const chunks = stdout.split(`${SAGA_BEGIN}\n`).slice(1);
  for (const chunk of chunks) {
    const endIdx = chunk.indexOf(SAGA_END);
    if (endIdx < 0) continue;
    const header = chunk.slice(0, endIdx).replace(/\n$/, '');
    let rest = chunk.slice(endIdx + SAGA_END.length);
    if (rest.startsWith('\n')) rest = rest.slice(1);
    const commit = makeCommit(header, rest);
    if (commit.hash) commits.push(commit);
  }
  return commits;
}

function makeCommit(header: string, numstat: string): RawCommit {
  const lines = header.split('\n');
  const hash = lines[0] ?? '';
  const shortHash = lines[1] ?? '';
  const date = lines[2] ?? '';
  const authorName = lines[3] ?? '';
  const authorEmail = lines[4] ?? '';
  const parents = (lines[5] ?? '').split(/\s+/).filter(Boolean);
  const subject = lines[6] ?? '';
  const body = lines.slice(7).join('\n').replace(/\n+$/, '');

  const files: CommitFileChange[] = [];
  let insertions = 0;
  let deletions = 0;

  for (const rawLine of numstat.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseNumstatLine(line);
    if (!parsed) continue;
    files.push(parsed);
    insertions += parsed.insertions;
    deletions += parsed.deletions;
  }

  return {
    hash,
    shortHash,
    date,
    authorName,
    authorEmail,
    subject,
    body: body.length > 0 ? body : undefined,
    parents,
    insertions,
    deletions,
    files,
  };
}

export function parseNumstatLine(line: string): CommitFileChange | null {
  const parts = line.split('\t');
  if (parts.length < 3) return null;
  const insRaw = parts[0];
  const delRaw = parts[1];
  const pathPart = parts.slice(2).join('\t');
  const isBinary = insRaw === '-' && delRaw === '-';
  const insertions = insRaw === '-' ? 0 : parseSafeInt(insRaw);
  const deletions = delRaw === '-' ? 0 : parseSafeInt(delRaw);

  let resolvedPath = pathPart;
  let oldPath: string | undefined;
  let status: FileStatus = isBinary ? 'binary' : 'modified';

  const braceMatch = pathPart.match(/^(.*?)\{(.*?) => (.*?)\}(.*)$/);
  if (braceMatch) {
    const [, prefix, fromInner, toInner, suffix] = braceMatch;
    oldPath = collapseSlashes(`${prefix}${fromInner}${suffix}`);
    resolvedPath = collapseSlashes(`${prefix}${toInner}${suffix}`);
    status = 'renamed';
  } else if (pathPart.includes(' => ')) {
    const [from, to] = pathPart.split(' => ');
    oldPath = from.trim();
    resolvedPath = to.trim();
    status = 'renamed';
  }

  return { path: resolvedPath, oldPath, insertions, deletions, status };
}

function collapseSlashes(s: string): string {
  return s.replace(/\/{2,}/g, '/');
}

function parseSafeInt(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

export async function readTags(
  repoPath: string,
  gitBin: string = 'git',
): Promise<RawTag[]> {
  try {
    const { stdout } = await execa(
      gitBin,
      [
        'for-each-ref',
        '--format=%(refname:short)\t%(creatordate:iso-strict)\t%(objectname)',
        'refs/tags',
      ],
      { cwd: repoPath },
    );
    if (!stdout.trim()) return [];
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, date, hash] = line.split('\t');
        return { name, date: date || undefined, hash: hash || undefined };
      });
  } catch {
    return [];
  }
}

export async function readBranches(
  repoPath: string,
  gitBin: string = 'git',
): Promise<string[]> {
  try {
    const { stdout } = await execa(gitBin, ['branch', '--format=%(refname:short)'], {
      cwd: repoPath,
    });
    return stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function readDefaultBranch(
  repoPath: string,
  gitBin: string = 'git',
): Promise<string | undefined> {
  try {
    const { stdout } = await execa(gitBin, ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
      cwd: repoPath,
    });
    const branch = stdout.trim();
    return branch.length > 0 ? branch : undefined;
  } catch {
    return undefined;
  }
}

async function pathIsDir(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function readRemoteNames(
  repoPath: string,
  gitBin: string,
): Promise<string[]> {
  try {
    const { stdout } = await execa(gitBin, ['-C', repoPath, 'remote']);
    return stdout
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readRemoteUrl(
  repoPath: string,
  remoteName: string,
  gitBin: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await execa(gitBin, ['-C', repoPath, 'remote', 'get-url', remoteName]);
    const remoteUrl = stdout.trim();
    return remoteUrl.length > 0 ? remoteUrl : undefined;
  } catch {
    return undefined;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

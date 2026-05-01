import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  deriveRepoName,
  isRemoteUrl,
  parseGitLog,
  parseNumstatLine,
  resolveSource,
} from '../src/git.js';

describe('isRemoteUrl', () => {
  it('detects https URLs', () => {
    expect(isRemoteUrl('https://github.com/user/repo')).toBe(true);
  });
  it('detects git@ urls', () => {
    expect(isRemoteUrl('git@github.com:user/repo.git')).toBe(true);
  });
  it('rejects relative paths', () => {
    expect(isRemoteUrl('./my-repo')).toBe(false);
    expect(isRemoteUrl('/abs/path')).toBe(false);
  });
});

describe('deriveRepoName', () => {
  it('handles https github urls', () => {
    expect(deriveRepoName('https://github.com/facebook/react')).toBe('react');
    expect(deriveRepoName('https://github.com/facebook/react.git')).toBe('react');
  });
  it('handles ssh urls', () => {
    expect(deriveRepoName('git@github.com:facebook/react.git')).toBe('react');
  });
  it('handles trailing slashes and query', () => {
    expect(deriveRepoName('https://gitlab.com/g/proj/?branch=main')).toBe('proj');
  });
  it('handles local paths', () => {
    expect(deriveRepoName('/Users/me/work/foo')).toBe('foo');
    expect(deriveRepoName('./foo')).toBe('foo');
  });
});

describe('parseNumstatLine', () => {
  it('parses basic added file', () => {
    const r = parseNumstatLine('10\t0\tsrc/index.ts');
    expect(r).toMatchObject({ path: 'src/index.ts', insertions: 10, deletions: 0, status: 'modified' });
  });
  it('parses deletion', () => {
    const r = parseNumstatLine('0\t40\tlegacy.js');
    expect(r).toMatchObject({ path: 'legacy.js', insertions: 0, deletions: 40 });
  });
  it('parses binary file', () => {
    const r = parseNumstatLine('-\t-\timg/logo.png');
    expect(r).toMatchObject({ path: 'img/logo.png', insertions: 0, deletions: 0, status: 'binary' });
  });
  it('parses brace-style rename', () => {
    const r = parseNumstatLine('5\t3\tsrc/{old.ts => new.ts}');
    expect(r?.status).toBe('renamed');
    expect(r?.path).toBe('src/new.ts');
    expect(r?.oldPath).toBe('src/old.ts');
  });
  it('parses arrow-style rename', () => {
    const r = parseNumstatLine('1\t1\told/path.ts => new/path.ts');
    expect(r?.status).toBe('renamed');
    expect(r?.path).toBe('new/path.ts');
    expect(r?.oldPath).toBe('old/path.ts');
  });
});

describe('parseGitLog', () => {
  const sample = [
    '__SAGA_BEGIN__',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaa',
    '2024-01-01T10:00:00+00:00',
    'Alice',
    'alice@example.com',
    '',
    'initial commit',
    '',
    '__SAGA_END__',
    '10\t0\tpackage.json',
    '5\t0\tsrc/index.ts',
    '__SAGA_BEGIN__',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbb',
    '2024-02-01T10:00:00+00:00',
    'Bob',
    'bob@example.com',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'add tsconfig',
    'this commit makes the project a typed people',
    '__SAGA_END__',
    '8\t1\ttsconfig.json',
    '0\t3\tsrc/legacy.js',
    '',
  ].join('\n');

  it('parses two commits with their numstat', () => {
    const commits = parseGitLog(sample);
    expect(commits).toHaveLength(2);
    expect(commits[0].subject).toBe('initial commit');
    expect(commits[0].files).toHaveLength(2);
    expect(commits[0].insertions).toBe(15);
    expect(commits[1].subject).toBe('add tsconfig');
    expect(commits[1].body).toContain('typed people');
    expect(commits[1].files.find((f) => f.path === 'tsconfig.json')).toBeDefined();
  });
});

describe('resolveSource remote cache', () => {
  it('refreshes a valid cached remote clone', async () => {
    const source = 'https://example.com/owner/repo.git';
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'repo-saga-git-'));
    const cacheDir = path.join(tmp, 'cache');
    const targetDir = path.join(cacheDir, cacheSlug(source));
    await mkdir(targetDir, { recursive: true });
    const logPath = path.join(tmp, 'git.log');
    const gitBin = await writeFakeGit(tmp);

    const prevLog = process.env.REPO_SAGA_GIT_LOG;
    const prevValid = process.env.REPO_SAGA_GIT_VALID;
    process.env.REPO_SAGA_GIT_LOG = logPath;
    process.env.REPO_SAGA_GIT_VALID = 'true';
    try {
      const resolved = await resolveSource(source, { cacheDir, gitBin });
      expect(resolved.resolvedPath).toBe(targetDir);
      const log = await readFile(logPath, 'utf8');
      expect(log).toContain('-C\t' + targetDir + '\trev-parse\t--is-inside-work-tree');
      expect(log).toContain('-C\t' + targetDir + '\tfetch\t--quiet\t--tags\t--prune');
      expect(log).toContain('-C\t' + targetDir + '\tpull\t--ff-only\t--quiet');
      expect(log).not.toContain('clone\t--quiet');
    } finally {
      restoreEnv('REPO_SAGA_GIT_LOG', prevLog);
      restoreEnv('REPO_SAGA_GIT_VALID', prevValid);
    }
  });

  it('reclones an invalid cached remote directory', async () => {
    const source = 'https://example.com/owner/broken.git';
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'repo-saga-git-'));
    const cacheDir = path.join(tmp, 'cache');
    const targetDir = path.join(cacheDir, cacheSlug(source));
    await mkdir(targetDir, { recursive: true });
    const logPath = path.join(tmp, 'git.log');
    const gitBin = await writeFakeGit(tmp);

    const prevLog = process.env.REPO_SAGA_GIT_LOG;
    const prevValid = process.env.REPO_SAGA_GIT_VALID;
    process.env.REPO_SAGA_GIT_LOG = logPath;
    process.env.REPO_SAGA_GIT_VALID = 'false';
    try {
      await resolveSource(source, { cacheDir, gitBin });
      const log = await readFile(logPath, 'utf8');
      expect(log).toContain('-C\t' + targetDir + '\trev-parse\t--is-inside-work-tree');
      expect(log).toContain(`clone\t--quiet\t${source}\t${targetDir}`);
      expect(log).not.toContain('\tfetch\t--quiet\t--tags\t--prune');
    } finally {
      restoreEnv('REPO_SAGA_GIT_LOG', prevLog);
      restoreEnv('REPO_SAGA_GIT_VALID', prevValid);
    }
  });
});

function cacheSlug(source: string): string {
  return createHash('sha1').update(source).digest('hex').slice(0, 16);
}

async function writeFakeGit(dir: string): Promise<string> {
  const gitBin = path.join(dir, 'fake-git.mjs');
  await writeFile(
    gitBin,
    [
      '#!/usr/bin/env node',
      "import { appendFileSync, mkdirSync } from 'node:fs';",
      'const args = process.argv.slice(2);',
      "appendFileSync(process.env.REPO_SAGA_GIT_LOG, args.join('\\t') + '\\n');",
      "if (args.includes('rev-parse')) {",
      "  if (process.env.REPO_SAGA_GIT_VALID === 'true') { console.log('true'); process.exit(0); }",
      '  process.exit(1);',
      '}',
      "if (args[0] === 'clone') mkdirSync(args[args.length - 1], { recursive: true });",
      'process.exit(0);',
      '',
    ].join('\n'),
    'utf8',
  );
  await chmod(gitBin, 0o755);
  return gitBin;
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

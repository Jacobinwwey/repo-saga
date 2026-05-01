import { describe, expect, it } from 'vitest';
import {
  deriveRepoName,
  isRemoteUrl,
  parseGitLog,
  parseNumstatLine,
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

import { describe, expect, it } from 'vitest';
import { buildAnalyzedRepo } from '../src/analyzer.js';
import { buildSagaStats } from '../src/index.js';
import { runDetectors } from '../src/detectors.js';
import { groupIntoEras } from '../src/eras.js';
import type { RawCommit } from '../src/types.js';

function commit(
  hash: string,
  date: string,
  subject: string,
  files: { path: string; insertions: number; deletions: number; status?: 'modified' | 'renamed' | 'binary' | 'added' | 'deleted' }[],
  email = 'alice@example.com',
  name = 'Alice',
): RawCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    date,
    authorName: name,
    authorEmail: email,
    parents: [],
    subject,
    body: undefined,
    insertions: files.reduce((s, f) => s + f.insertions, 0),
    deletions: files.reduce((s, f) => s + f.deletions, 0),
    files: files.map((f) => ({
      path: f.path,
      insertions: f.insertions,
      deletions: f.deletions,
      status: f.status ?? 'modified',
    })),
  };
}

describe('TypeScript Invasion detector', () => {
  it('fires when tsconfig.json appears and TS surpasses JS', () => {
    const commits: RawCommit[] = [];
    // 2019: pure JS
    for (let i = 0; i < 30; i++) {
      commits.push(
        commit(
          `js${i}`.padEnd(40, '0'),
          `2019-${String((i % 12) + 1).padStart(2, '0')}-15T00:00:00Z`,
          `feat: js change ${i}`,
          [{ path: `src/feature-${i}.js`, insertions: 100, deletions: 5 }],
        ),
      );
    }
    // 2020: tsconfig appears, ts files start
    commits.push(
      commit(
        'tsconfig00000000000000000000000000000000',
        '2020-02-01T00:00:00Z',
        'chore: introduce TypeScript',
        [{ path: 'tsconfig.json', insertions: 30, deletions: 0 }],
      ),
    );
    for (let i = 0; i < 40; i++) {
      commits.push(
        commit(
          `ts${i}`.padEnd(40, '0'),
          `2020-${String((i % 11) + 2).padStart(2, '0')}-10T00:00:00Z`,
          `feat: ts ${i}`,
          [{ path: `src/feature-${i}.ts`, insertions: 200, deletions: 0 }],
        ),
      );
    }
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    const ts = events.find((e) => e.type === 'typescript-invasion');
    expect(ts).toBeDefined();
    expect(ts!.evidence.join(' ')).toMatch(/tsconfig|TypeScript|TS/);
  });
});

describe('Linting Theocracy detector', () => {
  it('fires when eslint and prettier configs appear', () => {
    const commits: RawCommit[] = [];
    commits.push(
      commit('a'.repeat(40), '2021-01-01T00:00:00Z', 'init', [
        { path: 'src/index.ts', insertions: 10, deletions: 0 },
      ]),
    );
    commits.push(
      commit('b'.repeat(40), '2021-03-15T00:00:00Z', 'add lint', [
        { path: '.eslintrc.json', insertions: 25, deletions: 0 },
      ]),
    );
    commits.push(
      commit('c'.repeat(40), '2021-04-15T00:00:00Z', 'add prettier', [
        { path: '.prettierrc', insertions: 8, deletions: 0 },
      ]),
    );
    commits.push(
      commit('d'.repeat(40), '2021-05-15T00:00:00Z', 'add husky', [
        { path: '.husky/pre-commit', insertions: 4, deletions: 0 },
      ]),
    );
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    const lint = events.find((e) => e.type === 'linting-theocracy');
    expect(lint).toBeDefined();
    expect(lint!.evidence.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Testing Renaissance detector', () => {
  it('fires when many test files arrive in one year', () => {
    const commits: RawCommit[] = [];
    // 2021: only 2 test files
    commits.push(
      commit('p1'.repeat(20), '2021-06-01T00:00:00Z', 'feat', [
        { path: 'src/index.ts', insertions: 80, deletions: 0 },
        { path: 'tests/x.test.ts', insertions: 10, deletions: 0 },
      ]),
    );
    // 2022: vitest config + many tests
    commits.push(
      commit('vc0'.repeat(13) + '0', '2022-01-10T00:00:00Z', 'add vitest', [
        { path: 'vitest.config.ts', insertions: 12, deletions: 0 },
      ]),
    );
    for (let i = 0; i < 50; i++) {
      commits.push(
        commit(
          `t${i}`.padEnd(40, '0'),
          `2022-02-${String((i % 27) + 1).padStart(2, '0')}T00:00:00Z`,
          `add test ${i}`,
          [{ path: `tests/feature-${i}.test.ts`, insertions: 30, deletions: 0 }],
        ),
      );
    }
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    const ren = events.find((e) => e.type === 'testing-renaissance');
    expect(ren).toBeDefined();
    expect(ren!.evidence.some((e) => /vitest|test files/i.test(e))).toBe(true);
  });
});

describe('AI Priesthood detector word boundaries', () => {
  it('does not fire on coverage / fragment / drag (false-positive on "rag")', () => {
    const commits: RawCommit[] = [];
    for (let i = 0; i < 30; i++) {
      const subjects = [
        'add code coverage',
        'fix coverage drift',
        'split fragment helper',
        'drag-and-drop refactor',
        'engagement metric tweak',
      ];
      commits.push(
        commit(
          `c${i}`.padEnd(40, '0'),
          `2022-${String((i % 12) + 1).padStart(2, '0')}-15T00:00:00Z`,
          subjects[i % subjects.length],
          [{ path: `src/feature-${i}.ts`, insertions: 30, deletions: 0 }],
        ),
      );
    }
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    expect(events.find((e) => e.type === 'ai-priesthood')).toBeUndefined();
  });

  it('still fires on real AI keywords (langchain, openai, gpt-4)', () => {
    const commits: RawCommit[] = [];
    const aiSubjects = [
      'feat: integrate langchain agents',
      'wire openai client',
      'add gpt-4 fallback',
      'embed pgvector for retrieval',
      'use anthropic SDK for summaries',
    ];
    for (let i = 0; i < 12; i++) {
      commits.push(
        commit(
          `a${i}`.padEnd(40, '0'),
          `2024-${String((i % 12) + 1).padStart(2, '0')}-15T00:00:00Z`,
          aiSubjects[i % aiSubjects.length],
          [{ path: `src/ai-${i}.ts`, insertions: 30, deletions: 0 }],
        ),
      );
    }
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    expect(events.find((e) => e.type === 'ai-priesthood')).toBeDefined();
  });
});

describe('time travel stats', () => {
  it('builds daily D ± 30 day snapshots instead of yearly or weekly buckets', () => {
    const commits: RawCommit[] = [
      commit('a'.repeat(40), '2024-01-01T00:00:00Z', 'release: new year', [
        { path: 'src/january.ts', insertions: 10, deletions: 0 },
      ]),
      commit('b'.repeat(40), '2024-01-04T00:00:00Z', 'fix: early january', [
        { path: 'src/january.ts', insertions: 4, deletions: 1 },
      ]),
      commit('c'.repeat(40), '2024-03-15T00:00:00Z', 'release: spring', [
        { path: 'src/march.ts', insertions: 20, deletions: 2 },
      ]),
    ];
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const stats = buildSagaStats(analyzed, []);
    const snapshots = stats.timeTravelSnapshots ?? [];

    expect(snapshots.map((snapshot) => snapshot.date)).toContain('2024-01-02');
    expect(snapshots.map((snapshot) => snapshot.date)).toContain('2024-01-03');
    expect(snapshots.map((snapshot) => snapshot.date)).toContain('2024-03-15');

    const jan02 = snapshots.find((snapshot) => snapshot.date === '2024-01-02');
    expect(jan02?.windowStart).toBe('2023-12-03');
    expect(jan02?.windowEnd).toBe('2024-02-01');
    expect(jan02?.commits).toBe(2);
    expect(jan02?.activeFiles).toContain('src/january.ts');

    const feb10 = snapshots.find((snapshot) => snapshot.date === '2024-02-10');
    expect(feb10?.commits).toBe(0);
  });
});

describe('eras grouping', () => {
  it('returns at least one era and respects span bounds', () => {
    const commits: RawCommit[] = [];
    for (let y = 2019; y <= 2024; y++) {
      for (let m = 0; m < 12; m++) {
        commits.push(
          commit(
            `${y}${m}`.padEnd(40, '0'),
            `${y}-${String(m + 1).padStart(2, '0')}-15T00:00:00Z`,
            `commit`,
            [{ path: `src/${y}-${m}.ts`, insertions: 5, deletions: 0 }],
          ),
        );
      }
    }
    commits.push(
      commit('ts1'.repeat(13) + '0', '2020-01-15T00:00:00Z', 'add ts', [
        { path: 'tsconfig.json', insertions: 10, deletions: 0 },
      ]),
    );
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    const eras = groupIntoEras(analyzed, events);
    expect(eras.length).toBeGreaterThanOrEqual(2);
    expect(eras[0].startYear).toBe(2019);
    expect(eras[eras.length - 1].endYear).toBe(2024);
    for (let i = 1; i < eras.length; i++) {
      expect(eras[i].startYear).toBeGreaterThan(eras[i - 1].startYear);
    }
  });

  it('does not name every era after a 10-year background event', () => {
    const commits: RawCommit[] = [];
    // 2014–2024 — long history, monthly commits, modest activity
    for (let y = 2014; y <= 2024; y++) {
      for (let m = 0; m < 12; m++) {
        commits.push(
          commit(
            `${y}${m}x`.padEnd(40, '0'),
            `${y}-${String(m + 1).padStart(2, '0')}-10T00:00:00Z`,
            'chore: routine',
            [{ path: `src/${y}-${m}.js`, insertions: 4, deletions: 0 }],
          ),
        );
      }
    }
    // local punch: TypeScript invasion in 2019
    commits.push(
      commit('tsf'.repeat(13) + '0', '2019-01-15T00:00:00Z', 'feat: switch to ts', [
        { path: 'tsconfig.json', insertions: 18, deletions: 0 },
      ]),
    );
    for (let i = 0; i < 35; i++) {
      commits.push(
        commit(
          `tx${i}`.padEnd(40, '0'),
          `2019-${String((i % 11) + 2).padStart(2, '0')}-10T00:00:00Z`,
          `feat: ts-${i}`,
          [{ path: `src/feat-${i}.ts`, insertions: 200, deletions: 0 }],
        ),
      );
    }
    // 60+ tags spanning entire history -> Release Empire is epoch-defining and full-span
    const tags = [];
    for (let i = 0; i < 65; i++) {
      const y = 2014 + (i % 11);
      tags.push({
        name: `v${i}.0.0`,
        date: `${y}-06-15T00:00:00Z`,
        hash: `tag${i}`.padEnd(40, '0'),
      });
    }
    const analyzed = buildAnalyzedRepo({
      repoName: 'sample',
      source: '/sample',
      resolvedPath: '/sample',
      commits,
      tags,
    });
    const { events } = runDetectors(analyzed);
    const eras = groupIntoEras(analyzed, events);
    // Release Empire spans the whole history; not every era should inherit its name
    const releaseEmpireNamed = eras.filter((e) => e.name.includes('Release Empire'));
    expect(releaseEmpireNamed.length).toBeLessThan(eras.length);
    // No long-running event should name more than one era — era names must be distinct.
    const names = eras.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('handles a quiet repo gracefully', () => {
    const commits: RawCommit[] = [
      commit('x'.repeat(40), '2024-01-01T00:00:00Z', 'init', [
        { path: 'README.md', insertions: 1, deletions: 0 },
      ]),
    ];
    const analyzed = buildAnalyzedRepo({
      repoName: 'quiet',
      source: '/quiet',
      resolvedPath: '/quiet',
      commits,
      tags: [],
    });
    const { events } = runDetectors(analyzed);
    const eras = groupIntoEras(analyzed, events);
    expect(eras.length).toBeGreaterThan(0);
    expect(eras[0].startYear).toBe(2024);
  });
});

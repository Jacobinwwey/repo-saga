import { describe, expect, it } from 'vitest';
import type { Saga } from '@repo-saga/core';
import { renderSvg, wrapText } from '../src/svg.js';

const fixture: Saga = {
  schemaVersion: 1,
  repo: {
    name: 'demo',
    source: '/path/to/demo',
    resolvedPath: '/path/to/demo',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    commitCount: 1234,
    firstCommitDate: '2019-03-12T08:00:00Z',
    lastCommitDate: '2024-09-30T14:00:00Z',
    contributors: 17,
    defaultBranch: 'main',
    tagCount: 12,
  },
  eras: [
    {
      id: 'era-1',
      name: 'Ancient Era: Initial Chaos',
      startYear: 2019,
      endYear: 2020,
      theme: 'foundations',
      summary: 'A founding generation laid the cornerstones.',
      summaryStats: { commits: 300, contributors: 4, insertions: 12000, deletions: 2000 },
      dominantEvents: ['initial-chaos-2019'],
      evidence: ['182 commits in the first 4 months'],
    },
    {
      id: 'era-2',
      name: 'Migration Era: TypeScript Invasion',
      startYear: 2021,
      endYear: 2022,
      theme: 'a typed people',
      summary: 'Untyped JS gave way to TypeScript.',
      summaryStats: { commits: 700, contributors: 9, insertions: 50000, deletions: 8000 },
      dominantEvents: ['typescript-invasion-2021'],
      evidence: ['tsconfig appeared in 2021'],
    },
    {
      id: 'era-3',
      name: 'Modern Era: Linting Theocracy',
      startYear: 2023,
      endYear: 2024,
      theme: 'a clergy of formatters',
      summary: 'Style is law.',
      summaryStats: { commits: 600, contributors: 12, insertions: 30000, deletions: 12000 },
      dominantEvents: ['linting-theocracy-2023'],
      evidence: ['eslint and prettier configs are pinned'],
    },
  ],
  events: [
    {
      id: 'initial-chaos-2019',
      type: 'initial-chaos',
      title: 'Initial Chaos',
      startDate: '2019-03-12T08:00:00Z',
      endDate: '2019-05-12T08:00:00Z',
      startYear: 2019,
      endYear: 2019,
      severity: 'major',
      confidence: 0.8,
      narrative: 'narrative',
      evidence: ['fact'],
      score: 2.4,
    },
    {
      id: 'typescript-invasion-2021',
      type: 'typescript-invasion',
      title: 'TypeScript Invasion',
      startDate: '2021-01-15T08:00:00Z',
      endDate: '2022-12-31T23:59:59Z',
      startYear: 2021,
      endYear: 2022,
      severity: 'major',
      confidence: 0.9,
      narrative: 'types migrated',
      evidence: ['tsconfig 2021'],
      score: 2.7,
    },
    {
      id: 'linting-theocracy-2023',
      type: 'linting-theocracy',
      title: 'Linting Theocracy',
      startDate: '2023-02-01T00:00:00Z',
      endDate: '2024-08-01T00:00:00Z',
      startYear: 2023,
      endYear: 2024,
      severity: 'major',
      confidence: 0.7,
      narrative: 'lint and prettier rule',
      evidence: ['eslint config in 2023'],
      score: 2.1,
    },
  ],
  stats: {
    commitsByYear: { '2019': 100, '2020': 200, '2021': 300 },
    insertionsByYear: {},
    deletionsByYear: {},
    contributorsByYear: {},
    testRatioByYear: {},
    languagesByYear: { '2021': { ts: 1000, js: 200 } },
    topContributors: [{ name: 'Alice', email: 'alice@x', commits: 200 }],
  },
  meta: {
    generator: 'repo-saga',
    generatorVersion: '0.1.0',
    durationMs: 1234,
    detectorsRun: ['initial-chaos', 'typescript-invasion'],
  },
};

describe('renderSvg', () => {
  it('contains the title and era names', () => {
    const svg = renderSvg(fixture);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('The Civilization of demo');
    // era names are re-derived from each era's lead event by the renderer
    expect(svg).toContain('Ancient Era: Initial Chaos');
    expect(svg).toContain('Migration Era: TypeScript Invasion');
    expect(svg).toContain('Theocratic Era: Linting Theocracy');
    expect(svg).toContain('2019');
    expect(svg).toContain('2024');
    expect(svg).toContain('REPO-SAGA');
  });

  it('respects theme switching', () => {
    const dark = renderSvg(fixture, { theme: 'dark-fantasy' });
    expect(dark).toContain('#0a0c1d');
    const academic = renderSvg(fixture, { theme: 'academic' });
    expect(academic).toContain('#9c1f2e');
  });

  it('escapes XML in repo name', () => {
    const naughty = JSON.parse(JSON.stringify(fixture)) as Saga;
    naughty.repo.name = '<script>alert(1)</script>';
    const svg = renderSvg(naughty);
    expect(svg).not.toContain('<script>alert(1)');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('renders Chinese era names, event titles, and labels when lang is zh', () => {
    const svg = renderSvg(fixture, { lang: 'zh' });
    // header
    expect(svg).toContain('demo 的文明史');
    expect(svg).toContain('一份 REPO-SAGA 文明编年');
    // era cards
    expect(svg).toContain('远古纪元: 初始混沌');
    expect(svg).toContain('迁徙纪元: TypeScript 入侵');
    expect(svg).toContain('神权时代: 格式化与 Linter 之治');
    // labels in card
    expect(svg).toContain('本纪元的定义性事件');
    // footer
    expect(svg).toContain('主流语言：');
    expect(svg).toContain('编年的守护者：');
    expect(svg).toContain('生成于');
    // CJK font fallback in font-family (serif themes use Source Han Serif)
    expect(svg).toContain('Source Han Serif SC');
  });

  it('uses CJK sans fallback for the dark-fantasy theme', () => {
    const svg = renderSvg(fixture, { lang: 'zh', theme: 'dark-fantasy' });
    expect(svg).toContain('PingFang SC');
  });

  it('truncates overcrowded poster labels instead of emitting unbounded text', () => {
    const crowded = JSON.parse(JSON.stringify(fixture)) as Saga;
    crowded.repo.name = 'demo-project-with-a-very-long-name-that-would-otherwise-cross-the-header-art';
    crowded.stats.languagesByYear = {
      '2024': {
        typescript: 1000,
        javascript: 900,
        vue: 800,
        snapshot: 700,
        jsx: 600,
      },
    };
    crowded.stats.topContributors = [
      { name: 'An Extremely Verbose Maintainer Name', email: 'a@example.com', commits: 200 },
      { name: 'Another Long Contributor Handle', email: 'b@example.com', commits: 180 },
      { name: 'Third Contributor With Extra Words', email: 'c@example.com', commits: 160 },
      { name: 'Fourth Contributor With Extra Words', email: 'd@example.com', commits: 140 },
      { name: 'Fifth Contributor With Extra Words', email: 'e@example.com', commits: 120 },
    ];
    crowded.events[1].evidence = [
      'tsconfig.json first appeared on 2021-01-15 (packages/a/very/deeply/nested/client/tsconfig.json)',
    ];

    const svg = renderSvg(crowded);
    expect(svg).toContain('…');
    expect(svg).not.toContain(crowded.repo.name);
    expect(svg).not.toContain('packages/a/very/deeply/nested/client/tsconfig.json');
  });

  it('renders display period labels in the header, timeline, and event cards', () => {
    const quarterly = JSON.parse(JSON.stringify(fixture)) as Saga;
    quarterly.repo.firstPeriodLabel = '2024 Q1';
    quarterly.repo.lastPeriodLabel = '2024 Q3';
    quarterly.repo.firstCommitDate = '2024-01-03T08:00:00Z';
    quarterly.repo.lastCommitDate = '2024-09-29T18:00:00Z';
    quarterly.eras = quarterly.eras.map((era, index) => ({
      ...era,
      startYear: 2001 + index,
      endYear: 2001 + index,
      startDate: `2024-0${index * 3 + 1}-01`,
      endDate: `2024-0${index * 3 + 3}-30`,
      displayStartLabel: `2024 Q${index + 1}`,
      displayEndLabel: `2024 Q${index + 1}`,
    }));
    quarterly.events = quarterly.events.map((event, index) => ({
      ...event,
      startYear: 2001 + index,
      endYear: 2001 + index,
      displayStartLabel: `2024 Q${index + 1}`,
      displayEndLabel: `2024 Q${index + 1}`,
    }));

    const svg = renderSvg(quarterly);
    expect(svg).toContain('2024 Q1 — 2024 Q3');
    expect(svg).toContain('2024 Q1');
    expect(svg).toContain('2024 Q2');
    expect(svg).toContain('TypeScript Invasion  · 2024 Q2');
    expect(svg).not.toContain('2001–2001');

    const timelineBandMatches = [...svg.matchAll(/<rect x="([^"]+)" y="345" width="([^"]+)" height="20" fill="[^"]+" opacity="0\.25" \/>/g)];
    const timelineBandXs = timelineBandMatches.map((match) => Number.parseFloat(match[1]));
    expect(new Set(timelineBandXs).size).toBeGreaterThan(1);
    expect(timelineBandXs).toEqual([...timelineBandXs].sort((left, right) => left - right));
  });
});

describe('wrapText', () => {
  it('wraps long input across lines', () => {
    const lines = wrapText('one two three four five', 8);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(15);
  });
});

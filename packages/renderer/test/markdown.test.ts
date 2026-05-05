import { describe, expect, it } from 'vitest';
import type { Saga } from '@repo-saga/core';
import { renderMarkdown } from '../src/markdown.js';

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
      theme: 'foundations and improvisation',
      summary: 'A founding generation laid the cornerstones.',
      summaryStats: { commits: 300, contributors: 4, insertions: 12000, deletions: 2000 },
      dominantEvents: ['initial-chaos-2019'],
      evidence: ['182 commits in the first 4 months', 'package.json on 2019-03-12'],
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
      evidence: ['tsconfig.json appeared on 2021-01-15'],
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
      narrative: 'The first tribes gathered around fragile structure of files and hope.',
      evidence: ['182 commits in the first 4 months', '32 distinct files touched'],
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
      narrative: 'A migration of types swept across the land.',
      evidence: ['tsconfig.json on 2021-01-15', 'TypeScript crossed 50% in 2021'],
      score: 2.7,
    },
  ],
  stats: {
    commitsByYear: { '2019': 100, '2020': 200, '2021': 300, '2022': 400 },
    insertionsByYear: {},
    deletionsByYear: {},
    contributorsByYear: {},
    testRatioByYear: {},
    languagesByYear: {},
    topContributors: [{ name: 'Alice', email: 'alice@x', commits: 200 }],
  },
  meta: {
    generator: 'repo-saga',
    generatorVersion: '0.1.0',
    durationMs: 1234,
    detectorsRun: ['initial-chaos', 'typescript-invasion'],
  },
};

describe('renderMarkdown', () => {
  it('produces a structured chronicle with eras and evidence', () => {
    const md = renderMarkdown(fixture);
    expect(md).toContain('# The Civilization of demo');
    expect(md).toContain('## Ancient Era: Initial Chaos, 2019–2020');
    expect(md).toContain('## Migration Era: TypeScript Invasion, 2021–2022');
    expect(md).toContain('182 commits in the first 4 months');
    expect(md).toContain('TypeScript crossed 50% in 2021');
    expect(md).toContain('### Initial Chaos (2019)');
    expect(md).toContain('### TypeScript Invasion (2021–2022)');
    expect(md).toContain('repo-saga');
  });

  it('renders Chinese headings, era names, event titles when lang is zh', () => {
    const md = renderMarkdown(fixture, { lang: 'zh' });
    expect(md).toContain('# demo 的文明史');
    expect(md).toContain('## 远古纪元: 初始混沌, 2019–2020');
    expect(md).toContain('## 迁徙纪元: TypeScript 入侵, 2021–2022');
    expect(md).toContain('### 初始混沌 (2019)');
    expect(md).toContain('### TypeScript 入侵 (2021–2022)');
    expect(md).toContain('**证据：**');
    expect(md).toContain('**本纪元中的事件：**');
    expect(md).toContain('强度：**重大**，置信度：80%。');
    expect(md).toContain('## 编年附注');
    expect(md).toContain('### 主要贡献者');
    // era summary recomposed in zh from summaryStats, including translated event titles
    expect(md).toContain('2019–2020：300 次提交，4 位贡献者');
    expect(md).toContain('本纪元的标志性事件：初始混沌');
    expect(md).toContain('本纪元的标志性事件：TypeScript 入侵');
    // evidence strings translated from common English templates
    expect(md).toContain('182 commits in the first 4 months'); // doesn't match a known template — left alone
    // event-level evidence with embedded date pattern gets translated
  });

  it('translates evidence strings that match known detector templates', () => {
    const enriched: Saga = {
      ...fixture,
      events: [
        {
          ...fixture.events[1],
          evidence: [
            'tsconfig.json first appeared on 2021-01-15 (packages/foo/tsconfig.json)',
            'TypeScript crossed 50% of code insertions in 2021',
            '64 tags found between 2015-12-05 and 2025-09-30',
          ],
        },
      ],
    } as Saga;
    const md = renderMarkdown(enriched, { lang: 'zh' });
    expect(md).toContain('tsconfig.json 首次出现于 2021-01-15（packages/foo/tsconfig.json）');
    expect(md).toContain('TypeScript 在 2021 年越过代码插入量的 50%');
    expect(md).toContain('在 2015-12-05 至 2025-09-30 之间共发现 64 个 tag');
  });

  it('uses display period labels and translates temporal evidence', () => {
    const quarterly: Saga = {
      ...fixture,
      repo: {
        ...fixture.repo,
        firstPeriodLabel: '2024 Q1',
        lastPeriodLabel: '2024 Q2',
      },
      eras: [
        {
          ...fixture.eras[0],
          startYear: 2001,
          endYear: 2001,
          displayStartLabel: '2024 Q1',
          displayEndLabel: '2024 Q1',
          evidence: [
            'Period 2024 Q1 ran from 2024-01-01 to 2024-03-31',
            '12 commits, 3 contributors, +120 / -40 lines',
            'Opened with chore: bootstrap',
            'Closed with feat: foundation',
          ],
        },
      ],
      events: [
        {
          ...fixture.events[0],
          startYear: 2001,
          endYear: 2001,
          displayStartLabel: '2024 Q1',
          displayEndLabel: '2024 Q1',
        },
      ],
    };

    const md = renderMarkdown(quarterly, { lang: 'zh' });
    expect(md).toContain('2024 Q1–2024 Q2，1,234 次提交');
    expect(md).toContain('## 远古纪元: 初始混沌, 2024 Q1');
    expect(md).toContain('### 初始混沌 (2024 Q1)');
    expect(md).toContain('时间段 2024 Q1 从 2024-01-01 延续至 2024-03-31');
    expect(md).toContain('12 次提交，3 位贡献者，+120 / -40 行');
    expect(md).toContain('以「chore: bootstrap」开篇');
    expect(md).toContain('以「feat: foundation」收尾');
  });
});

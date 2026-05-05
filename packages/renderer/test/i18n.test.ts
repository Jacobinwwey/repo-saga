import { describe, expect, it } from 'vitest';
import type { Saga } from '@repo-saga/core';
import { renderSvg } from '../src/svg.js';
import { label, translateEventTitle } from '../src/i18n.js';

const fixture: Saga = {
  schemaVersion: 1,
  repo: {
    name: 'demo',
    source: '/path/to/demo',
    resolvedPath: '/path/to/demo',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    commitCount: 42,
    firstCommitDate: '2024-01-01T00:00:00Z',
    lastCommitDate: '2024-06-30T00:00:00Z',
    contributors: 3,
    defaultBranch: 'main',
    tagCount: 2,
    firstPeriodLabel: '2024 Q1',
    lastPeriodLabel: '2024 Q2',
  },
  eras: [
    {
      id: 'era-1',
      name: 'Ancient Era: Initial Chaos',
      startYear: 2001,
      endYear: 2001,
      displayStartLabel: '2024 Q1',
      displayEndLabel: '2024 Q1',
      theme: 'foundations and improvisation',
      summary: 'Quarter one summary.',
      summaryStats: { commits: 20, contributors: 2, insertions: 120, deletions: 10 },
      dominantEvents: ['initial-chaos-2024-q1'],
      evidence: ['Period 2024 Q1 ran from 2024-01-01 to 2024-03-31'],
    },
  ],
  events: [
    {
      id: 'initial-chaos-2024-q1',
      type: 'initial-chaos',
      title: 'Initial Chaos',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-03-31T23:59:59Z',
      startYear: 2001,
      endYear: 2001,
      displayStartLabel: '2024 Q1',
      displayEndLabel: '2024 Q1',
      severity: 'major',
      confidence: 0.8,
      narrative: 'Foundations appeared quickly.',
      evidence: ['Opened with docs: found the repo'],
      score: 2.4,
    },
  ],
  stats: {
    commitsByYear: { '2024': 42 },
    insertionsByYear: {},
    deletionsByYear: {},
    contributorsByYear: {},
    testRatioByYear: {},
    languagesByYear: { '2024': { ts: 100 } },
    topContributors: [{ name: 'Alice', email: 'alice@example.com', commits: 20 }],
  },
  meta: {
    generator: 'repo-saga',
    generatorVersion: '0.1.0',
    durationMs: 123,
    detectorsRun: ['initial-chaos'],
  },
};

const DOWNSTREAM_README_LOCALES = [
  'ar',
  'bn',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'fi',
  'fr',
  'he',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
  'zh',
  'zh_Hant',
] as const;

describe('renderer i18n coverage', () => {
  it('renders translated poster copy for every downstream README locale', () => {
    const englishHeading = label('en', 'definingEvents');
    const englishTitle = translateEventTitle('initial-chaos', 'en');

    for (const locale of DOWNSTREAM_README_LOCALES) {
      const localizedHeading = label(locale as never, 'definingEvents');
      const localizedTitle = translateEventTitle('initial-chaos', locale as never);
      const svg = renderSvg(fixture, { lang: locale as never });

      expect(localizedHeading).not.toBe(englishHeading);
      expect(localizedTitle).not.toBe(englishTitle);
      expect(svg).toContain(localizedHeading);
      expect(svg).toContain(localizedTitle);
      expect(svg).not.toMatch(/__[A-Z0-9_]+__/);
    }
  });

  it('keeps Traditional Chinese distinct from Simplified Chinese', () => {
    expect(label('zh_Hant' as never, 'definingEvents')).not.toBe(label('zh' as never, 'definingEvents'));
    expect(translateEventTitle('initial-chaos', 'zh_Hant' as never)).not.toBe(
      translateEventTitle('initial-chaos', 'zh' as never),
    );
  });

  it('interpolates generated locale label templates that still use double-underscore tokens', () => {
    expect(label('ja' as never, 'civilizationOf', { name: 'demo' })).toContain('demo');
    expect(label('zh_Hant' as never, 'eraThemeTemplate', { title: 'TypeScript 入侵' })).toContain(
      'TypeScript 入侵',
    );
    expect(
      label('es' as never, 'eraSummary', {
        period: '2025 Q2',
        commits: 10,
        contributors: 2,
        insertions: 300,
        deletions: 40,
        events: 'Caos inicial',
      }),
    ).not.toMatch(/__[A-Z0-9_]+__/);
  });
});

import { describe, expect, it } from 'vitest';
import type { Saga } from '@repo-saga/core';
import { renderSvg } from '../src/svg.js';
import { label, translateEvidence, translateEventTitle } from '../src/i18n.js';

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
      expect(svg).not.toContain('\uFFFD');
    }
  });

  it('keeps Traditional Chinese distinct from Simplified Chinese', () => {
    expect(label('zh_Hant' as never, 'definingEvents')).not.toBe(
      label('zh' as never, 'definingEvents'),
    );
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

  it('uses localized full-sentence era summaries for every downstream README locale', () => {
    const englishSummary = label('en', 'eraSummary', {
      period: '2025 Q2',
      commits: 10,
      contributors: 2,
      insertions: 300,
      deletions: 40,
      events: 'Initial Chaos',
    });
    const englishQuiet = label('en', 'eraSummaryQuiet', {
      period: '2025 Q2',
      commits: 10,
      contributors: 2,
      insertions: 300,
      deletions: 40,
      events: 'Initial Chaos',
    });

    for (const locale of DOWNSTREAM_README_LOCALES) {
      if (locale === 'en') continue;
      const summary = label(locale as never, 'eraSummary', {
        period: '2025 Q2',
        commits: 10,
        contributors: 2,
        insertions: 300,
        deletions: 40,
        events: 'Initial Chaos',
      });
      const quiet = label(locale as never, 'eraSummaryQuiet', {
        period: '2025 Q2',
        commits: 10,
        contributors: 2,
        insertions: 300,
        deletions: 40,
        events: 'Initial Chaos',
      });

      expect(summary).not.toBe(englishSummary);
      expect(quiet).not.toBe(englishQuiet);
      expect(summary).not.toContain('Defining moments');
      expect(quiet).not.toContain('No defining heuristic events landed');
      expect(summary).not.toMatch(/__[A-Z0-9_]+__/);
      expect(quiet).not.toMatch(/__[A-Z0-9_]+__/);
    }
  });

  it('overrides known English fallback leaks in downstream locales', () => {
    const norwegianSvg = renderSvg(
      {
        ...fixture,
        eras: [
          {
            ...fixture.eras[0],
            name: 'Settler Era: Habits Take Root',
            dominantEvents: [],
            theme: 'a quieter chapter between bigger upheavals',
          },
        ],
        events: [],
      },
      { lang: 'no' as never },
    );
    const greekSvg = renderSvg(
      {
        ...fixture,
        eras: [
          {
            ...fixture.eras[0],
            id: 'era-bug',
            name: 'The Dark Years: Bug Plague',
            dominantEvents: ['bug-plague-2024-q1'],
          },
          {
            ...fixture.eras[0],
            id: 'era-2',
            name: 'Late Era: Maturity Sets In',
            dominantEvents: [],
          },
        ],
        events: [
          fixture.events[0],
          {
            ...fixture.events[0],
            id: 'bug-plague-2024-q1',
            type: 'bug-plague',
            title: 'Bug Plague',
          },
        ],
      },
      { lang: 'el' as never },
    );

    expect(norwegianSvg).not.toContain('The Civilization of');
    expect(norwegianSvg).not.toContain('Settler Era');
    expect(norwegianSvg).not.toContain('Empire');
    expect(greekSvg).not.toContain('Late Era: Maturity Sets In');
    expect(greekSvg).not.toContain('Bug Plague');
    expect(greekSvg).not.toContain('Empire');
  });

  it('replaces known machine-translated poster copy with curated locale copy', () => {
    const arabicSvg = renderSvg(fixture, { lang: 'ar' as never });
    const bengaliSvg = renderSvg(fixture, { lang: 'bn' as never });
    const traditionalChineseSvg = renderSvg(fixture, { lang: 'zh_Hant' as never });

    expect(arabicSvg).toContain('الأحداث الفاصلة');
    expect(translateEventTitle('typescript-invasion', 'ar' as never)).toBe('اجتياح TypeScript');
    expect(arabicSvg).not.toContain('غزو الآلة الكاتبة');

    expect(bengaliSvg).toContain('নির্ধারক ঘটনা');
    expect(translateEventTitle('release-empire', 'bn' as never)).toBe('রিলিজ সাম্রাজ্য');
    expect(bengaliSvg).not.toContain('সাম্রাজ্য মুক্তি');

    expect(traditionalChineseSvg).toContain('定義性事件');
    expect(translateEventTitle('release-empire', 'zh_Hant' as never)).toBe('發布帝國');
    expect(traditionalChineseSvg).not.toContain('釋放帝國');
  });

  it('polishes previously awkward theme and evidence phrasing in selected locales', () => {
    const finnishSvg = renderSvg(fixture, { lang: 'fi' as never });
    const hindiSvg = renderSvg(fixture, { lang: 'hi' as never });
    const hungarianSvg = renderSvg(fixture, { lang: 'hu' as never });
    const japaneseSvg = renderSvg(fixture, { lang: 'ja' as never });
    const koreanSvg = renderSvg(fixture, { lang: 'ko' as never });
    const portugueseSvg = renderSvg(fixture, { lang: 'pt' as never });
    const traditionalChineseSvg = renderSvg(fixture, { lang: 'zh_Hant' as never });

    expect(finnishSvg).not.toContain('TypeScriptin vyöry:n');
    expect(hindiSvg).not.toContain('द्वारा परिभाषित');
    expect(hungarianSvg).not.toContain('a A TypeScript');
    expect(japaneseSvg).not.toContain('チャプター');
    expect(japaneseSvg).not.toContain('TypeScript侵攻 で定義された');
    expect(koreanSvg).not.toContain('tsconfig.json 이');
    expect(portugueseSvg).not.toContain('contribuidores');
    expect(portugueseSvg).not.toContain('Império das releases');
    expect(traditionalChineseSvg).not.toContain('決定性時刻');

    expect(label('zh_Hant' as never, 'civilizationOf', { name: 'demo' })).toBe('demo 的文明史');
    expect(
      translateEvidence('38 tags found between 2025-04-17 and 2026-05-03', 'el' as never),
    ).toContain('ετικέτες');
    expect(
      translateEvidence(
        'tsconfig.json first appeared on 2025-04-17 (tsconfig.json)',
        'ja' as never,
      ),
    ).toBe('tsconfig.jsonは 2025-04-17 に初めて現れた (tsconfig.json)');
    expect(
      translateEvidence(
        'tsconfig.json first appeared on 2025-04-17 (tsconfig.json)',
        'ko' as never,
      ),
    ).toBe('tsconfig.json이 2025-04-17에 처음 나타났다 (tsconfig.json)');
    expect(label('ko' as never, 'eraThemeTemplate', { title: 'TypeScript 침공' })).toBe(
      'TypeScript 침공의 색채가 짙은 장',
    );
    expect(
      label('pt' as never, 'eraSummary', {
        period: '2025 Q2',
        commits: 10,
        contributors: 2,
        insertions: 300,
        deletions: 40,
        events: 'Caos inicial',
      }),
    ).toContain('colaboradores');
    expect(
      label('zh_Hant' as never, 'eraSummary', {
        period: '2025 Q2',
        commits: 10,
        contributors: 2,
        insertions: 300,
        deletions: 40,
        events: '初始混亂',
      }),
    ).toContain('定義性事件');
    expect(label('zh_Hant' as never, 'eraThemeTemplate', { title: 'TypeScript 入侵' })).toBe(
      '由 TypeScript 入侵 定義的篇章',
    );
  });
});

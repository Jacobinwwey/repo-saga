import type { DetectedEvent, Era, EventSeverity, EventType, Saga } from '@repo-saga/core';
import { GENERATED_LOCALE_DATA } from './generated-locales.js';

export const SUPPORTED_LANGS = [
  'en',
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

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export type Lang = string;

interface EventCopy {
  title: string;
  narrative: string;
}

interface EraProfile {
  prefix: string;
  theme: string;
}

const EVENT_COPY: Record<'en' | 'zh', Record<EventType, EventCopy>> = {
  en: {
    'initial-chaos': {
      title: 'Initial Chaos',
      narrative:
        'The first tribes gather around a fragile structure of files and hope. Foundational artefacts appear in rapid succession.',
    },
    'typescript-invasion': {
      title: 'TypeScript Invasion',
      narrative:
        'Annotations crept in like missionaries with grammar primers, until untyped tongues fell out of fashion.',
    },
    'great-refactor-war': {
      title: 'The Great Refactor War',
      narrative:
        'Cartographers redrew the borders of every directory. What was once one continent became three.',
    },
    'testing-famine': {
      title: 'Testing Famine',
      narrative:
        'The granaries of regression coverage stood empty. Business logic multiplied while assertions slept.',
    },
    'testing-renaissance': {
      title: 'Testing Renaissance',
      narrative:
        'A flowering of specs, fixtures, and CI rigour. The chronicle was being checked, not just written.',
    },
    'linting-theocracy': {
      title: 'Linting Theocracy',
      narrative:
        'A clergy of formatters and linters governed each pull request. Hooks rose where humans had judged before.',
    },
    'container-empire': {
      title: 'Container Empire',
      narrative:
        'Every service learned to speak the language of containers. Roads of YAML connected the provinces.',
    },
    'monorepo-federation': {
      title: 'Monorepo Federation',
      narrative:
        'City-states united under a single workspace banner. Common builds, shared tools, federated releases.',
    },
    'dependency-cataclysm': {
      title: 'Dependency Cataclysm',
      narrative:
        'Lockfiles trembled. Whole version graphs were torn up and rebuilt overnight.',
    },
    'founder-exodus': {
      title: 'Founder Exodus',
      narrative:
        'Some of those who first lit the campfires walked away. Their commits faded from the chronicle, leaving habits behind.',
    },
    'new-dynasty': {
      title: 'New Dynasty',
      narrative:
        'Fresh banners appeared on the ramparts. New contributors took up the maintenance plough and turned the codebase into their inheritance.',
    },
    'ai-priesthood': {
      title: 'AI Priesthood',
      narrative:
        'A new clergy arrived bearing model weights and prompt scrolls. Vector stores rose where SQL had once ruled.',
    },
    'bug-plague': {
      title: 'Bug Plague',
      narrative:
        'A season of regressions and emergency hotfixes. The chronicle filled with apologies in commit messages.',
    },
    'release-empire': {
      title: 'Release Empire',
      narrative:
        'Versioned banners flew over every milestone. Tags multiplied like bureaucratic decrees, marking a steady cadence of triumphs and rollbacks alike.',
    },
  },
  zh: {
    'initial-chaos': {
      title: '初始混沌',
      narrative: '初代部落围绕脆弱的文件结构集结，凭希望开荒。地基性的器物在短时间内接连出现。',
    },
    'typescript-invasion': {
      title: 'TypeScript 入侵',
      narrative: '类型标注像带着语法手册的传教士一样渗入，直到无类型的方言被边缘化。',
    },
    'great-refactor-war': {
      title: '大重构战争',
      narrative: '制图师重新划定了每个目录的边界。一片大陆被切分成数个新邦。',
    },
    'testing-famine': {
      title: '测试饥荒',
      narrative: '回归测试的粮仓空置，业务逻辑疯狂繁殖，断言却在沉睡。',
    },
    'testing-renaissance': {
      title: '测试文艺复兴',
      narrative: '规格、夹具与 CI 严谨齐放，编年史不仅被书写，也被反复检验。',
    },
    'linting-theocracy': {
      title: '格式化与 Linter 之治',
      narrative: '格式化器与 linter 的祭司团执掌每一次 PR，钩子取代了过往凭直觉的裁定。',
    },
    'container-empire': {
      title: '容器帝国',
      narrative: '每个服务都学会了用容器的语言交谈，YAML 修筑的道路连接着各个行省。',
    },
    'monorepo-federation': {
      title: 'Monorepo 联邦',
      narrative: '各城邦在同一个工作区旗帜下结盟，共享构建、统一工具、协调发布。',
    },
    'dependency-cataclysm': {
      title: '依赖大灾变',
      narrative: 'lockfile 颤抖，整张版本图被一夜之间撕裂重建。',
    },
    'founder-exodus': {
      title: '元老出走',
      narrative: '点燃第一堆篝火的人陆续离去，他们的 commit 在编年史上渐渐褪色，只留下习惯。',
    },
    'new-dynasty': {
      title: '新人登基',
      narrative: '新的旌旗插上城头，新人接过维护的犁铧，把这份代码当作自己的继承之物。',
    },
    'ai-priesthood': {
      title: 'AI 祭司团',
      narrative: '带着模型权重与提示词卷轴的新祭司到来。向量库取代了 SQL 的旧位置。',
    },
    'bug-plague': {
      title: 'Bug 大瘟疫',
      narrative: '回归与紧急修复的季节，commit message 中写满了道歉与抢救。',
    },
    'release-empire': {
      title: '发布帝国',
      narrative: 'Tag 像官府的诏令一样增殖，每一个里程碑都飘起带着版本号的旗帜，胜利与回滚同样有序。',
    },
  },
};

const EVENT_TITLES_ZH_HANT: Record<EventType, string> = {
  'initial-chaos': '初始混亂',
  'typescript-invasion': 'TypeScript 入侵',
  'great-refactor-war': '大重構戰爭',
  'testing-famine': '測試饑荒',
  'testing-renaissance': '測試文藝復興',
  'linting-theocracy': '格式化與 Linter 之治',
  'container-empire': '容器帝國',
  'monorepo-federation': 'Monorepo 聯邦',
  'dependency-cataclysm': '依賴大災變',
  'founder-exodus': '元老出走',
  'new-dynasty': '新人登基',
  'ai-priesthood': 'AI 祭司團',
  'bug-plague': 'Bug 大瘟疫',
  'release-empire': '發布帝國',
};

const LOCALE_EVENT_TITLE_OVERRIDES: Partial<Record<SupportedLang, Partial<Record<EventType, string>>>> = {
  da: {
    'linting-theocracy': 'Linting-teokratiet',
    'release-empire': 'Udgivelsesimperiet',
  },
  el: {
    'great-refactor-war': 'Ο Μεγάλος Πόλεμος Αναδόμησης',
    'linting-theocracy': 'Θεοκρατία του Linting',
    'bug-plague': 'Πανούκλα Σφαλμάτων',
    'release-empire': 'Αυτοκρατορία Κυκλοφοριών',
  },
  fi: {
    'typescript-invasion': 'TypeScriptin invaasio',
    'release-empire': 'Julkaisuimperiumi',
  },
  fr: {
    'release-empire': 'Empire des publications',
  },
  hu: {
    'release-empire': 'Kiadási Birodalom',
  },
  no: {
    'release-empire': 'Utgivelsesimperiet',
  },
  sv: {
    'typescript-invasion': 'TypeScript-invasion',
    'release-empire': 'Utgivningsimperiet',
  },
  th: {
    'linting-theocracy': 'เทวาธิปไตยแห่ง Linting',
  },
};

const LOCALE_FALLBACK_ERA_NAME_OVERRIDES: Partial<Record<SupportedLang, string[]>> = {
  el: [
    'Ιδρυτική Εποχή: Ένα Χρονικό Αρχίζει',
    'Εποχή εποίκων: Οι συνήθειες ριζώνουν',
    'Μεσαίο Βασίλειο: Αργή Παρέκκλιση',
    'Μεταρρύθμιση: Ήσυχες αλλαγές',
    'Ύστερη Εποχή: Η ωριμότητα κατασταλάζει',
    'Εποχή του Λυκόφωτος: Σταθερά χέρια',
    'Σύγχρονη Εποχή: Το παρόν',
  ],
  no: [
    'Grunnleggelsens æra: En krønike begynner',
    'Nybyggeræra: Vaner tar rot',
    'Midtriket: En langsom drift',
    'Reformasjonen: Stille endringer',
    'Sen æra: modenhet setter inn',
    'Skumringsæra: Stødige hender',
    'Moderne tid: Dagen i dag',
  ],
};

const LOCALE_LABEL_OVERRIDES: Partial<Record<SupportedLang, Partial<Record<LabelKey, string>>>> = {
  no: {
    civilizationOf: 'Sivilisasjonen til __NAME__',
  },
};

const ERA_PROFILE: Record<'en' | 'zh', Record<EventType, EraProfile>> = {
  en: {
    'initial-chaos': { prefix: 'Ancient Era', theme: 'foundations and improvisation' },
    'typescript-invasion': { prefix: 'Migration Era', theme: 'a typed people supplanting the old idioms' },
    'great-refactor-war': { prefix: 'Age of Civil War', theme: 'borders redrawn by sweeping refactors' },
    'testing-famine': { prefix: 'Lean Years', theme: 'tests are scarce and prayers carry the weight' },
    'testing-renaissance': { prefix: 'Renaissance', theme: 'a flowering of specs, fixtures, and CI rigour' },
    'linting-theocracy': { prefix: 'Theocratic Era', theme: 'a clergy of formatters and linters governs the code' },
    'container-empire': { prefix: 'Imperial Era', theme: 'every service speaks the language of containers' },
    'monorepo-federation': { prefix: 'Federation Era', theme: 'city-states united under one workspace banner' },
    'dependency-cataclysm': { prefix: 'Cataclysmic Era', theme: 'lockfiles tremble, version graphs are rewritten' },
    'founder-exodus': { prefix: 'Era of Departure', theme: 'old hands fade from the chronicle' },
    'new-dynasty': { prefix: 'New Dynasty', theme: 'fresh stewards inherit the codebase' },
    'ai-priesthood': { prefix: 'Age of the Oracle', theme: 'machine intelligence is wired into the daily liturgy' },
    'bug-plague': { prefix: 'The Dark Years', theme: 'a season of regressions and emergency hotfixes' },
    'release-empire': { prefix: 'Imperial Stability', theme: 'tags and releases drum out a steady tempo' },
  },
  zh: {
    'initial-chaos': { prefix: '远古纪元', theme: '在地基与即兴之间打磨' },
    'typescript-invasion': { prefix: '迁徙纪元', theme: '一个有类型的民族取代了旧方言' },
    'great-refactor-war': { prefix: '内战时代', theme: '在大刀阔斧的重构中重新划界' },
    'testing-famine': { prefix: '匮乏之年', theme: '测试稀缺，祈祷承担其余的重量' },
    'testing-renaissance': { prefix: '文艺复兴', theme: '规格、夹具与 CI 严谨齐绽' },
    'linting-theocracy': { prefix: '神权时代', theme: '格式化与 linter 的祭司治理着代码' },
    'container-empire': { prefix: '帝国时代', theme: '每一个服务都说着容器的语言' },
    'monorepo-federation': { prefix: '联邦时代', theme: '城邦在同一面工作区旗帜下结盟' },
    'dependency-cataclysm': { prefix: '大灾变时代', theme: 'lockfile 颤抖，版本图被改写' },
    'founder-exodus': { prefix: '出走时代', theme: '旧人渐次淡出编年史' },
    'new-dynasty': { prefix: '新王朝', theme: '新的牧守者继承这份代码' },
    'ai-priesthood': { prefix: '神谕时代', theme: '机器智能被接入每日的礼仪' },
    'bug-plague': { prefix: '黑暗之年', theme: '回归与紧急修复轮番上演' },
    'release-empire': { prefix: '帝国安定', theme: 'Tag 与发布敲出稳定的鼓点' },
  },
};

const FALLBACK_ERA_NAMES: Record<'en' | 'zh', string[]> = {
  en: [
    'Founding Era: A Chronicle Begins',
    'Settler Era: Habits Take Root',
    'Middle Kingdom: A Slow Drift',
    'Reformation: Quiet Changes',
    'Late Era: Maturity Sets In',
    'Twilight Era: Steady Hands',
    'Modern Era: The Present Day',
  ],
  zh: [
    '开端纪元：编年史的第一笔',
    '安居时代：习惯生根',
    '中央王朝：缓慢的漂移',
    '改革时代：静水深流',
    '晚期时代：进入成熟',
    '余晖时代：手稳如旧',
    '现世纪元：当下正在发生',
  ],
};

const FALLBACK_THEME: Record<'en' | 'zh', string> = {
  en: 'a quieter chapter between bigger upheavals',
  zh: '两段动荡之间相对平静的章节',
};

const SEVERITY: Record<'en' | 'zh', Record<EventSeverity, string>> = {
  en: {
    minor: 'minor',
    notable: 'notable',
    major: 'major',
    'epoch-defining': 'epoch-defining',
  },
  zh: {
    minor: '次要',
    notable: '显著',
    major: '重大',
    'epoch-defining': '划时代',
  },
};

const LABELS = {
  en: {
    civilizationOf: 'The Civilization of {name}',
    chronicleSubtitle:
      '_A repo-saga civilization history. {period}, {commits} commits, {contributors} contributors, {tags} tags._',
    poster_subtitle:
      '{period}  ·  {commits} commits  ·  {contributors} contributors  ·  {tags} tags',
    posterTagline: 'A REPO-SAGA CHRONICLE',
    definingEvents: 'DEFINING EVENTS',
    quietStretch: '— a quiet stretch in the chronicle —',
    topLanguages: 'Top languages: {value}',
    stewards: 'Stewards of the chronicle: {value}',
    posterFooter: 'REPO-SAGA  ·  v{version}  ·  GENERATED {date}',
    evidenceHeading: '**Evidence:**',
    eventsHeading: '**Events in this era:**',
    evidence: 'Evidence:',
    severityLine: 'Severity: **{severity}**, confidence: {pct}%.',
    eraSummary:
      '{period}: {commits} commits, {contributors} contributors, +{insertions} / -{deletions} lines. Defining moments: {events}.',
    eraSummaryQuiet:
      '{period}: {commits} commits, {contributors} contributors, +{insertions} / -{deletions} lines. No defining heuristic events landed in this stretch — the chronicle ran quiet.',
    chronicleEmpty: '_No eras could be carved — the chronicle is empty._',
    footnotesHeading: '## Chronicle Footnotes',
    footnoteSource: '- **Source:** `{value}`',
    footnoteAnalyzed: '- **Analysed at:** {value}',
    footnoteCommits: '- **Commits:** {value}',
    footnoteContributors: '- **Contributors:** {value}',
    footnoteFirstCommit: '- **First commit:** {value}',
    footnoteLastCommit: '- **Last commit:** {value}',
    footnoteDefaultBranch: '- **Default branch:** {value}',
    footnoteTags: '- **Tags:** {value}',
    topContribsHeading: '### Top Contributors',
    tableHeader: '| Name | Commits |',
    tableDivider: '| --- | --- |',
    generatedBy: '_Generated by [{generator}](https://github.com/) v{version} in {ms} ms._',
    unknown: 'unknown',
    metricCommits: 'COMMITS',
    metricContributors: 'CONTRIBUTORS',
    metricTags: 'TAGS',
    metricTopLanguages: 'TOP LANGUAGES',
    eventNarrativeTemplate: '{title} left a visible mark on this chapter of the chronicle.',
    eraThemeTemplate: 'a chapter defined by {title}',
    fallbackTheme: 'a quieter chapter between bigger upheavals',
  },
  zh: {
    civilizationOf: '{name} 的文明史',
    chronicleSubtitle:
      '_由 repo-saga 渲染的代码文明史。{period}，{commits} 次提交，{contributors} 位贡献者，{tags} 个 tag。_',
    poster_subtitle:
      '{period}  ·  {commits} 次提交  ·  {contributors} 位贡献者  ·  {tags} 个 tag',
    posterTagline: '一份 REPO-SAGA 文明编年',
    definingEvents: '本纪元的定义性事件',
    quietStretch: '— 编年史在此刻安静地呼吸 —',
    topLanguages: '主流语言：{value}',
    stewards: '编年的守护者：{value}',
    posterFooter: 'REPO-SAGA  ·  v{version}  ·  生成于 {date}',
    evidenceHeading: '**证据：**',
    eventsHeading: '**本纪元中的事件：**',
    evidence: '证据：',
    severityLine: '强度：**{severity}**，置信度：{pct}%。',
    eraSummary:
      '{period}：{commits} 次提交，{contributors} 位贡献者，+{insertions} / -{deletions} 行。本纪元的标志性事件：{events}。',
    eraSummaryQuiet:
      '{period}：{commits} 次提交，{contributors} 位贡献者，+{insertions} / -{deletions} 行。这一段并无显著事件 —— 编年史在此安静地流淌。',
    chronicleEmpty: '_无法切分纪元 —— 编年史尚为空白。_',
    footnotesHeading: '## 编年附注',
    footnoteSource: '- **来源：** `{value}`',
    footnoteAnalyzed: '- **分析时间：** {value}',
    footnoteCommits: '- **提交数：** {value}',
    footnoteContributors: '- **贡献者数：** {value}',
    footnoteFirstCommit: '- **首次提交：** {value}',
    footnoteLastCommit: '- **最近提交：** {value}',
    footnoteDefaultBranch: '- **默认分支：** {value}',
    footnoteTags: '- **Tag 数：** {value}',
    topContribsHeading: '### 主要贡献者',
    tableHeader: '| 姓名 | 提交数 |',
    tableDivider: '| --- | --- |',
    generatedBy: '_由 [{generator}](https://github.com/) v{version} 生成，耗时 {ms} ms。_',
    unknown: '未知',
    metricCommits: '提交',
    metricContributors: '贡献者',
    metricTags: 'TAG',
    metricTopLanguages: '主要语言',
    eventNarrativeTemplate: '{title} 在这一章编年中留下了清晰的痕迹。',
    eraThemeTemplate: '由 {title} 定义的章节',
    fallbackTheme: '两段动荡之间相对平静的章节',
  },
} as const;

export type LabelKey = keyof typeof LABELS.en;

export function label(lang: Lang, key: LabelKey, vars: Record<string, string | number> = {}): string {
  const locale = resolveLang(lang);
  const tpl = localeLabel(locale, key);
  return interpolateTemplate(normalizeLocalizedText(key, tpl), vars);
}

export function translateEventTitle(type: EventType, lang: Lang): string {
  const locale = resolveLang(lang);
  const overriddenTitle = LOCALE_EVENT_TITLE_OVERRIDES[locale]?.[type];
  if (overriddenTitle) return overriddenTitle;
  if (locale === 'en' || locale === 'zh') return EVENT_COPY[locale][type]?.title ?? EVENT_COPY.en[type].title;
  if (locale === 'zh_Hant') return EVENT_TITLES_ZH_HANT[type];
  return GENERATED_LOCALE_DATA[locale]?.eventTitles?.[type] ?? EVENT_COPY.en[type].title;
}

export function translateEventNarrative(type: EventType, lang: Lang): string {
  const locale = resolveLang(lang);
  if (locale === 'en' || locale === 'zh') return EVENT_COPY[locale][type]?.narrative ?? EVENT_COPY.en[type].narrative;
  return label(locale, 'eventNarrativeTemplate', { title: translateEventTitle(type, locale) });
}

export function translateEraProfile(type: EventType, lang: Lang): EraProfile {
  const locale = resolveLang(lang);
  if (locale === 'en' || locale === 'zh') return ERA_PROFILE[locale][type] ?? ERA_PROFILE.en[type];
  const prefix =
    locale === 'zh_Hant'
      ? GENERATED_LOCALE_DATA.zh_Hant.eraPrefixes[type]
      : GENERATED_LOCALE_DATA[locale]?.eraPrefixes?.[type];
  return {
    prefix: prefix ?? ERA_PROFILE.en[type].prefix,
    theme: label(locale, 'eraThemeTemplate', { title: translateEventTitle(type, locale) }),
  };
}

export function translateSeverity(sev: EventSeverity, lang: Lang): string {
  const locale = resolveLang(lang);
  if (locale === 'en' || locale === 'zh') return SEVERITY[locale][sev] ?? SEVERITY.en[sev];
  if (locale === 'zh_Hant') return localeSeverity(locale, sev);
  return GENERATED_LOCALE_DATA[locale]?.severities?.[sev] ?? SEVERITY.en[sev];
}

export function translateFallbackTheme(lang: Lang): string {
  const locale = resolveLang(lang);
  if (locale === 'en' || locale === 'zh') return FALLBACK_THEME[locale] ?? FALLBACK_THEME.en;
  return label(locale, 'fallbackTheme');
}

const FALLBACK_INDEX: Record<string, number> = {
  'Founding Era: A Chronicle Begins': 0,
  'Settler Era: Habits Take Root': 1,
  'Middle Kingdom: A Slow Drift': 2,
  'Reformation: Quiet Changes': 3,
  'Late Era: Maturity Sets In': 4,
  'Twilight Era: Steady Hands': 5,
  'Modern Era: The Present Day': 6,
};

// Mirrors core/eras.ts isLocalToEra. An event is "local" to an era if it
// doesn't strictly wrap the era while spanning ≥1.5× its length — those long
// background events would otherwise dominate every era's name.
function isLocalToEra(event: DetectedEvent, era: Era): boolean {
  const eraLen = era.endYear - era.startYear + 1;
  const evtLen = event.endYear - event.startYear + 1;
  const wraps = event.startYear < era.startYear && event.endYear > era.endYear;
  return !(wraps && evtLen >= eraLen * 1.5);
}

/**
 * Re-derive an era's display name and theme in the requested language.
 *
 * Strategy: walk era.dominantEvents (sorted by score desc), pick the first one
 * that is local to this era, and look up its translated profile. If no local
 * event qualifies, map the era's English fallback name to its translation.
 */
export function translateEra(
  era: Era,
  events: DetectedEvent[],
  lang: Lang,
): { name: string; theme: string } {
  const locale = resolveLang(lang);
  // Honor the lead chosen at era-build time. If the era has `leadEventId`
  // (modern build), use it strictly — undefined means "no event named this
  // era, use fallback", because reselecting from dominantEvents would
  // reintroduce the cross-era duplicate-naming bug. For legacy sagas
  // without leadEventId, fall back to the old reselection behavior so
  // pre-existing saga.json files still translate.
  const lead =
    'leadEventId' in era
      ? era.leadEventId
        ? events.find((e) => e.id === era.leadEventId)
        : undefined
      : era.dominantEvents
          .map((id) => events.find((e) => e.id === id))
          .find((e): e is DetectedEvent => Boolean(e && isLocalToEra(e, era)));
  if (lead) {
    const profile = translateEraProfile(lead.type, locale);
    const title = translateEventTitle(lead.type, locale);
    return { name: `${profile.prefix}: ${title}`, theme: profile.theme };
  }
  const idx = FALLBACK_INDEX[era.name];
  const fallbackArr = fallbackEraNamesFor(locale);
  if (idx !== undefined) return { name: fallbackArr[idx], theme: translateFallbackTheme(locale) };
  return { name: era.name, theme: era.theme };
}

/**
 * Translate a single event's title + narrative for rendering, leaving the
 * dynamically-generated evidence array untouched (it's locale-agnostic data
 * with embedded numbers and dates).
 */
export function translateEvent(event: DetectedEvent, lang: Lang): DetectedEvent {
  return {
    ...event,
    title: translateEventTitle(event.type, lang),
    narrative: translateEventNarrative(event.type, lang),
  };
}

/**
 * Re-derive an era's summary line in the requested language, using the
 * structured numbers core stored on era.summaryStats. Falls back to the
 * English string baked into era.summary if those numbers are missing
 * (keeps backwards-compat with sagas serialised before summaryStats existed).
 */
export function composeEraSummary(era: Era, events: DetectedEvent[], lang: Lang): string {
  const stats = era.summaryStats;
  if (!stats) return era.summary;
  const locale = resolveLang(lang);
  const startLabel = era.displayStartLabel ?? `${era.startYear}`;
  const endLabel = era.displayEndLabel ?? `${era.endYear}`;
  const period = startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`;
  const dominant = era.dominantEvents
    .map((id) => events.find((e) => e.id === id))
    .filter((e): e is DetectedEvent => Boolean(e))
    .slice(0, 3);
  const key = dominant.length > 0 ? 'eraSummary' : 'eraSummaryQuiet';
  const separator = locale === 'zh' || locale === 'zh_Hant' || locale === 'ja' ? '、' : ', ';
  const eventList = dominant.map((e) => translateEventTitle(e.type, locale)).join(separator);
  return label(lang, key, {
    period,
    commits: stats.commits.toLocaleString(),
    contributors: stats.contributors,
    insertions: stats.insertions.toLocaleString(),
    deletions: stats.deletions.toLocaleString(),
    events: eventList,
  });
}

/**
 * Best-effort translation of a single evidence string. Most detectors emit
 * strings that match a small set of regular templates with embedded numbers,
 * dates, and identifiers — we rewrite those into the target language.
 * Anything that does not match a known pattern is returned unchanged
 * (English fallback) rather than mangled.
 */
export function translateEvidence(text: string, lang: Lang): string {
  const locale = resolveLang(lang);
  if (locale === 'en' || !text) return text;
  const patterns = locale === 'zh' ? ZH_EVIDENCE_PATTERNS : GENERIC_EVIDENCE_PATTERNS;
  for (const [pattern, replacement] of patterns) {
    const m = text.match(pattern);
    if (m) {
      try {
        return replacement(m, locale);
      } catch {
        return text;
      }
    }
  }
  return text;
}

const GENERIC_EVIDENCE_PATTERNS: Array<
  readonly [RegExp, (m: RegExpMatchArray, lang: SupportedLang) => string]
> = [
  [/^(\d[\d,]*) commits in the first (\d+) day\(s\)$/, (m, lang) => genericEvidence(lang, 'commitsInFirstDays', { COMMITS: m[1], DAYS: m[2] })],
  [/^(\d[\d,]*) insertions during the founding period$/, (m, lang) => genericEvidence(lang, 'insertionsDuringFounding', { INSERTIONS: m[1] })],
  [/^(\d[\d,]*) distinct files touched in the early period$/, (m, lang) => genericEvidence(lang, 'distinctFilesEarly', { FILES: m[1] })],
  [/^Earliest contributors: (.+)$/, (m, lang) => genericEvidence(lang, 'earliestContributors', { VALUE: m[1] })],
  [/^tsconfig\.json first appeared on (\S+) \((.+)\)$/, (m, lang) => genericEvidence(lang, 'tsconfigAppeared', { DATE: m[1], PATH: m[2] })],
  [/^TypeScript crossed 50% of code insertions in (\d+)$/, (m, lang) => genericEvidence(lang, 'tsCrossed50', { YEAR: m[1] })],
  [/^By (\d+), \+(\d[\d,]*) TS insertions vs \+(\d[\d,]*) JS insertions$/, (m, lang) => genericEvidence(lang, 'tsByYear', { YEAR: m[1], TS: m[2], JS: m[3] })],
  [/^Test files touched per year jumped from (\d+) \((\d+)\) to (\d+) \((\d+)\)$/, (m, lang) => genericEvidence(lang, 'testFilesJumped', { FROM: m[1], FROM_YEAR: m[2], TO: m[3], TO_YEAR: m[4] })],
  [/^(\d[\d,]*) distinct files changed in a 90-day window$/, (m, lang) => genericEvidence(lang, 'distinctFilesWindow', { FILES: m[1] })],
  [/^(\d[\d,]*) files renamed during the upheaval$/, (m, lang) => genericEvidence(lang, 'filesRenamed', { COUNT: m[1] })],
  [/^(\d[\d,]*) files purged from the kingdom$/, (m, lang) => genericEvidence(lang, 'filesPurged', { COUNT: m[1] })],
  [/^([0-9a-f]{6,}) on (\S+) touched (\d[\d,]*) lockfile lines$/, (m, lang) => genericEvidence(lang, 'lockfileTouched', { HASH: m[1], DATE: m[2], LINES: m[3] })],
  [/^(\d+) commit\(s\) involved heavy dependency churn$/, (m, lang) => genericEvidence(lang, 'heavyDependencyChurn', { COUNT: m[1] })],
  [/^(\d[\d,]*) tags found between (\S+) and (\S+)$/, (m, lang) => genericEvidence(lang, 'tagsFoundBetween', { COUNT: m[1], START: m[2], END: m[3] })],
  [/^Earliest tag: (.+)$/, (m, lang) => genericEvidence(lang, 'earliestTag', { VALUE: m[1] })],
  [/^Latest tag: (.+)$/, (m, lang) => genericEvidence(lang, 'latestTag', { VALUE: m[1] })],
  [/^(.+?) (?:appeared|arrived|introduced) at (.+) on (\S+)$/, (m, lang) => genericEvidence(lang, 'genericSignalArrived', { KIND: m[1], PATH: m[2], DATE: m[3] })],
  [/^(\d+) of (\d+) commits in (\S+) were bug-themed \((\d+)%\)$/, (m, lang) => genericEvidence(lang, 'bugMonthPeak', { BUGS: m[1], TOTAL: m[2], MONTH: m[3], PCT: m[4] })],
  [/^(\d{4}-\d{2}-\d{2}): "(.+)" appeared in commit (\S+) "(.+)"$/, (m, lang) => genericEvidence(lang, 'aiHitInCommit', { DATE: m[1], HIT: m[2], HASH: m[3], SUBJECT: m[4] })],
  [/^(\d{4}-\d{2}-\d{2}): "(.+)" appeared in path (.+)$/, (m, lang) => genericEvidence(lang, 'aiHitInPath', { DATE: m[1], HIT: m[2], PATH: m[3] })],
  [/^Period (.+) ran from (\S+) to (\S+)$/, (m, lang) => genericEvidence(lang, 'periodRan', { LABEL: m[1], START: m[2], END: m[3] })],
  [/^(\d[\d,]*) commits, (\d+) contributors, \+(\d[\d,]*) \/ -(\d[\d,]*) lines$/, (m, lang) => genericEvidence(lang, 'periodStats', { COMMITS: m[1], CONTRIBUTORS: m[2], INSERTIONS: m[3], DELETIONS: m[4] })],
  [/^Opened with (.+)$/, (m, lang) => genericEvidence(lang, 'openedWith', { SUBJECT: m[1] })],
  [/^Closed with (.+)$/, (m, lang) => genericEvidence(lang, 'closedWith', { SUBJECT: m[1] })],
  [/^(.+?) \(([^)]+)\) — (.+)$/, (m, lang) => {
    const title = ENGLISH_TITLE_TO_TYPE[m[1]];
    const localizedTitle = title ? translateEventTitle(title, lang) : m[1];
    const rest = translateEvidence(m[3], lang);
    return `${localizedTitle} (${m[2]}) — ${rest}`;
  }],
];

// Patterns mirror the literal templates emitted by packages/core detectors.ts
// and packages/core eras.ts. Order matters: more specific patterns first.
const ZH_EVIDENCE_PATTERNS: Array<readonly [RegExp, (m: RegExpMatchArray, lang: Lang) => string]> = [
  // initial-chaos
  [/^(\d[\d,]*) commits in the first (\d+) day\(s\)$/, (m) => `前 ${m[2]} 天里产生了 ${m[1]} 次提交`],
  [/^(\d[\d,]*) insertions during the founding period$/, (m) => `奠基期共有 ${m[1]} 行插入`],
  [/^(\d[\d,]*) distinct files touched in the early period$/, (m) => `奠基期共触及 ${m[1]} 个不同文件`],
  [/^Earliest contributors: (.+)$/, (m) => `最早的一批贡献者：${m[1]}`],
  // typescript-invasion
  [/^tsconfig\.json first appeared on (\S+) \((.+)\)$/, (m) => `tsconfig.json 首次出现于 ${m[1]}（${m[2]}）`],
  [/^TypeScript crossed 50% of code insertions in (\d+)$/, (m) => `TypeScript 在 ${m[1]} 年越过代码插入量的 50%`],
  [/^By (\d+), \+(\d[\d,]*) TS insertions vs \+(\d[\d,]*) JS insertions$/, (m) => `截至 ${m[1]} 年，TypeScript 插入 +${m[2]} 行，JavaScript 插入 +${m[3]} 行`],
  // testing-famine
  [/^Test insertions stayed below 5% of code insertions from (\d+) to (\d+)$/, (m) => `从 ${m[1]} 到 ${m[2]}，测试插入始终低于代码插入的 5%`],
  [/^Worst year (\d+): only (\S+)% of insertions came from tests$/, (m) => `最荒年 ${m[1]} 年：仅 ${m[2]}% 的插入来自测试`],
  // testing-renaissance
  [/^Test files touched per year jumped from (\d+) \((\d+)\) to (\d+) \((\d+)\)$/, (m) => `每年触及的测试文件从 ${m[1]}（${m[2]} 年）跃升至 ${m[3]}（${m[4]} 年）`],
  // monorepo-federation
  [/^packages\/ directory came into existence$/, () => `packages/ 目录就此诞生`],
  [/^apps\/ directory came into existence$/, () => `apps/ 目录就此诞生`],
  // great-refactor-war
  [/^New top-level structures appeared: (.+)$/, (m) => `出现了新的顶层结构：${m[1]}`],
  [/^(\d[\d,]*) distinct files changed in a 90-day window$/, (m) => `90 天内共改动 ${m[1]} 个不同文件`],
  [/^(\d[\d,]*) files renamed during the upheaval$/, (m) => `动荡期共重命名 ${m[1]} 个文件`],
  [/^(\d[\d,]*) files purged from the kingdom$/, (m) => `共有 ${m[1]} 个文件被清出版本库`],
  // dependency-cataclysm
  [/^([0-9a-f]{6,}) on (\S+) touched (\d[\d,]*) lockfile lines$/, (m) => `提交 ${m[1]} 在 ${m[2]} 改动了 ${m[3]} 行 lockfile`],
  [/^(\d+) commit\(s\) involved heavy dependency churn$/, (m) => `${m[1]} 次提交涉及大规模依赖变动`],
  [/^Notable subject: "(.+)"$/, (m) => `代表性提交主题："${m[1]}"`],
  // founder-exodus
  [/^(.+) \((\d+) early commits\) was last seen on (\S+)$/, (m) => `${m[1]}（${m[2]} 次早期提交）最后一次提交于 ${m[3]}`],
  // new-dynasty
  [/^(.+) appeared late and made (\d+) commits$/, (m) => `${m[1]} 在后期登场并贡献了 ${m[2]} 次提交`],
  // ai-priesthood — match e.g. '2024-03-12: "openai" appeared in commit abc123 "feat: wire openai"'
  [/^(\S+): "(.+)" appeared in commit (\S+) "(.+)"$/, (m) => `${m[1]}：「${m[2]}」出现于提交 ${m[3]}「${m[4]}」`],
  [/^(\S+): "(.+)" appeared in path (.+)$/, (m) => `${m[1]}：「${m[2]}」出现于路径 ${m[3]}`],
  [/^…and (\d+) more AI-keyword hits$/, (m) => `……另有 ${m[1]} 处 AI 关键词命中`],
  // bug-plague
  [/^(\d+) of (\d+) commits in (\S+) were bug-themed \((\d+)%\)$/, (m) => `${m[3]} 月有 ${m[1]}/${m[2]} 次提交带 bug 关键字（${m[4]}%）`],
  // simple "DATE: subject" used by bug-plague & ai-priesthood sample lines
  [/^(\d{4}-\d{2}-\d{2}): "(.+)"$/, (m) => `${m[1]}：「${m[2]}」`],
  // release-empire
  [/^(\d[\d,]*) tags found between (\S+) and (\S+)$/, (m) => `在 ${m[2]} 至 ${m[3]} 之间共发现 ${m[1]} 个 tag`],
  [/^Earliest tag: (.+)$/, (m) => `最早的 tag：${m[1]}`],
  [/^Latest tag: (.+)$/, (m) => `最新的 tag：${m[1]}`],
  [/^(\d+) tag\(s\) follow a SemVer-ish pattern$/, (m) => `${m[1]} 个 tag 遵循 SemVer 风格`],
  // signal-file phrases used by initial-chaos, container-empire, monorepo-federation, linting-theocracy, testing-renaissance
  [/^(.+?) (?:appeared|arrived|introduced) at (.+) on (\S+)$/, (m) => `${m[1]} 于 ${m[3]} 出现在 ${m[2]}`],
  // era-level: "Spanned X year(s) with Y commits"
  [/^Spanned (\d+) year\(s\) with (\d[\d,]*) commits$/, (m) => `横跨 ${m[1]} 年，共 ${m[2]} 次提交`],
  [/^Period (.+) ran from (\S+) to (\S+)$/, (m) => `时间段 ${m[1]} 从 ${m[2]} 延续至 ${m[3]}`],
  [/^(\d[\d,]*) commits, (\d+) contributors, \+(\d[\d,]*) \/ -(\d[\d,]*) lines$/, (m) => `${m[1]} 次提交，${m[2]} 位贡献者，+${m[3]} / -${m[4]} 行`],
  [/^Opened with (.+)$/, (m) => `以「${m[1]}」开篇`],
  [/^Closed with (.+)$/, (m) => `以「${m[1]}」收尾`],
  // era-level: '${title} (yr) — ${rest}' or '${title} (a–b) — ${rest}'
  [/^(.+?) \(([^)]+)\) — (.+)$/, (m, lang) => {
    const title = ENGLISH_TITLE_TO_TYPE[m[1]];
    const localizedTitle = title ? translateEventTitle(title, lang) : m[1];
    const rest = translateEvidence(m[3], lang);
    return `${localizedTitle}（${m[2]}）—— ${rest}`;
  }],
];

const ENGLISH_TITLE_TO_TYPE: Record<string, EventType> = {
  'Initial Chaos': 'initial-chaos',
  'TypeScript Invasion': 'typescript-invasion',
  'The Great Refactor War': 'great-refactor-war',
  'Testing Famine': 'testing-famine',
  'Testing Renaissance': 'testing-renaissance',
  'Linting Theocracy': 'linting-theocracy',
  'Container Empire': 'container-empire',
  'Monorepo Federation': 'monorepo-federation',
  'Dependency Cataclysm': 'dependency-cataclysm',
  'Founder Exodus': 'founder-exodus',
  'New Dynasty': 'new-dynasty',
  'AI Priesthood': 'ai-priesthood',
  'Bug Plague': 'bug-plague',
  'Release Empire': 'release-empire',
};

export function translateSaga(saga: Saga, lang: Lang): Saga {
  const locale = resolveLang(lang);
  if (locale === 'en') return saga;
  const events = saga.events.map((e) => ({
    ...translateEvent(e, locale),
    evidence: e.evidence.map((item) => translateEvidence(item, locale)),
  }));
  const eras = saga.eras.map((era) => {
    const { name, theme } = translateEra(era, saga.events, locale);
    return {
      ...era,
      name,
      theme,
      summary: composeEraSummary(era, saga.events, locale),
      evidence: era.evidence.map((item) => translateEvidence(item, locale)),
    };
  });
  return { ...saga, eras, events };
}

function resolveLang(lang: Lang): SupportedLang {
  const raw = String(lang ?? 'en').trim();
  if (!raw) return 'en';
  const normalized = raw.replace(/-/g, '_').toLowerCase();
  if (normalized === 'zh' || normalized === 'zh_cn' || normalized === 'zh_hans') return 'zh';
  if (normalized === 'zh_hant' || normalized === 'zh_tw') return 'zh_Hant';
  if (normalized === 'nb' || normalized === 'nn') return 'no';
  if (normalized === 'iw') return 'he';
  if (normalized === 'in') return 'id';
  return SUPPORTED_LANGS.find((value) => value.toLowerCase() === normalized) ?? 'en';
}

function localeLabel(locale: SupportedLang, key: LabelKey): string {
  if (locale === 'en' || locale === 'zh') return LABELS[locale][key] ?? LABELS.en[key];
  const overriddenLabel = LOCALE_LABEL_OVERRIDES[locale]?.[key];
  if (overriddenLabel) return overriddenLabel;
  const generatedLabels = GENERATED_LOCALE_DATA[locale]?.labels as Partial<Record<LabelKey, string>> | undefined;
  return generatedLabels?.[key] ?? LABELS.en[key];
}

function localeSeverity(locale: SupportedLang, sev: EventSeverity): string {
  if (locale === 'en' || locale === 'zh') return SEVERITY[locale][sev] ?? SEVERITY.en[sev];
  return GENERATED_LOCALE_DATA[locale]?.severities?.[sev] ?? SEVERITY.en[sev];
}

function fallbackEraNamesFor(locale: SupportedLang): string[] {
  if (locale === 'en' || locale === 'zh') return FALLBACK_ERA_NAMES[locale] ?? FALLBACK_ERA_NAMES.en;
  const overriddenNames = LOCALE_FALLBACK_ERA_NAME_OVERRIDES[locale];
  if (overriddenNames) return [...overriddenNames];
  return [...(GENERATED_LOCALE_DATA[locale]?.fallbackEraNames ?? FALLBACK_ERA_NAMES.en)];
}

function normalizeLocalizedText(key: LabelKey, value: string): string {
  const replacement = /\uFFFD+/g;
  if (key === 'poster_subtitle' || key === 'posterFooter') {
    return value.replace(replacement, ' · ');
  }
  if (key === 'quietStretch' || key === 'eraSummaryQuiet' || key === 'chronicleEmpty') {
    return value.replace(replacement, '—');
  }
  return value;
}

function genericEvidence(
  locale: SupportedLang,
  key: keyof (typeof GENERATED_LOCALE_DATA)[Exclude<SupportedLang, 'en' | 'zh'>]['evidenceTemplates'],
  vars: Record<string, string | number>,
): string {
  const template = GENERATED_LOCALE_DATA[locale as Exclude<SupportedLang, 'en' | 'zh'>]?.evidenceTemplates?.[key];
  if (!template) return '';
  return template.replace(/__([A-Z_]+)__/g, (_, token) => String(vars[token] ?? ''));
}

function interpolateTemplate(template: string, vars: Record<string, string | number>): string {
  if (!template) return template;
  const lookup = buildVarLookup(vars);
  return template
    .replace(/\{(\w+)\}/g, (_, key) => lookup.get(key) ?? '')
    .replace(/__([A-Za-z0-9_]+)__/g, (_, key) => lookup.get(key) ?? '');
}

function buildVarLookup(vars: Record<string, string | number>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [key, value] of Object.entries(vars)) {
    const stringValue = String(value);
    const upperSnake = toUpperSnakeCase(key);
    const lowerSnake = upperSnake.toLowerCase();
    for (const variant of [key, key.toLowerCase(), key.toUpperCase(), upperSnake, lowerSnake]) {
      lookup.set(variant, stringValue);
    }
  }
  return lookup;
}

function toUpperSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

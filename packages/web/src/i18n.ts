import type { EventSeverity, ProgressEvent } from '@repo-saga/core';
import { ALL_LANGS, languageLabel, type Lang } from '@repo-saga/renderer';
import type { ThemeName } from './theme';

export type UiLang = Lang;

type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface UiCopy {
  toolbar: {
    theme: string;
    language: string;
    themeLabels: Record<ThemeName, string>;
    languageLabels: Record<string, string>;
  };
  form: {
    label: string;
    placeholder: string;
    working: string;
    generate: string;
    examplesPrefix: string;
  };
  errors: {
    jobCreation: string;
    sagaRetrieval: string;
  };
  hero: {
    kicker: string;
    title: string;
    body: string;
    points: string[];
  };
  progress: {
    status: string;
    statusLabels: Record<JobStatus, string>;
    phaseLabels: Record<ProgressEvent['phase'], string>;
  };
  saga: {
    title: string;
    commits: string;
    contributors: string;
    tags: string;
    eras: string;
    events: string;
    downloadSvg: string;
    copyMarkdown: string;
    copied: string;
    downloadJson: string;
    hideJson: string;
    viewJson: string;
    posterAlt: string;
    noEraSelected: string;
    noEvents: string;
    confidence: string;
    workspaceLabel: string;
    workspaceKicker: string;
    workspaceTitle: string;
    workspaceBody: string;
    timeTravel: string;
    timeTravelSubtitle: string;
    activeCommits: string;
    activeContributors: string;
    activeDetectorEvents: string;
    activeFiles: string;
    contributorMode: string;
    allContributors: string;
    contributorVoice: string;
    perspectiveNote: string;
    contributorNarrativePrefix: string;
    yearCommits: string;
    activeYears: string;
    touchedFiles: string;
    topContributorsAtYear: string;
    evidenceLinks: string;
    evidenceLinkKinds: Record<'commit' | 'compare' | 'search' | 'file', string>;
    showDebug: string;
    hideDebug: string;
    positiveRoute: string;
    negativeRoute: string;
    threshold: string;
    distance: string;
    none: string;
    debugMetricLabels: Record<string, string>;
    debugValueLabels: Record<string, string>;
    severityLabels: Record<EventSeverity, string>;
  };
  footer: string;
}

export const LANGS: UiLang[] = ALL_LANGS;

const UI_COPY_BASE: Record<'en' | 'zh', UiCopy> = {
  en: {
    toolbar: {
      theme: 'Theme',
      language: 'Language',
      themeLabels: {
        epic: 'Epic',
        'dark-fantasy': 'Dark Fantasy',
        academic: 'Academic',
        minimal: 'Minimal',
      },
      languageLabels: {
        en: 'English',
        zh: '中文',
      },
    },
    form: {
      label: 'Repository URL or local path',
      placeholder: 'https://github.com/user/repo  or  /Users/me/projects/foo',
      working: 'Working...',
      generate: 'Generate',
      examplesPrefix: 'Try one of:',
    },
    errors: {
      jobCreation: 'Job creation failed',
      sagaRetrieval: 'Saga retrieval failed',
    },
    hero: {
      kicker: 'A repository chronicle',
      title: 'Render the civilization history of any repository',
      body:
        'Paste a GitHub URL or a local path. repo-saga mines git history with heuristic detectors, then turns migrations, refactors, releases, and rituals into an evidence-grounded chronicle.',
      points: [
        'Runs entirely on your machine. No external AI APIs.',
        'Outputs Markdown, JSON, and a printable SVG poster.',
        'Switch between four chronicle themes.',
      ],
    },
    progress: {
      status: 'Status',
      statusLabels: {
        queued: 'queued',
        running: 'running',
        done: 'done',
        error: 'error',
      },
      phaseLabels: {
        init: 'init',
        clone: 'clone',
        'git-log': 'git log',
        parsing: 'parsing',
        analysing: 'analysing',
        detecting: 'detecting',
        eras: 'eras',
        rendering: 'rendering',
        done: 'done',
        error: 'error',
      },
    },
    saga: {
      title: 'The Civilization of {name}',
      commits: 'commits',
      contributors: 'contributors',
      tags: 'tags',
      eras: 'eras',
      events: 'events',
      downloadSvg: 'Download SVG',
      copyMarkdown: 'Copy Markdown',
      copied: 'Copied',
      downloadJson: 'Download JSON',
      hideJson: 'Hide JSON',
      viewJson: 'View JSON',
      posterAlt: '{name} civilization poster ({theme} theme)',
      noEraSelected: 'No era selected',
      noEvents: 'No detected events in this era.',
      confidence: 'confidence',
      workspaceLabel: 'Interactive chronicle controls',
      workspaceKicker: 'Interactive atlas',
      workspaceTitle: 'Travel the repo timeline without losing the evidence trail',
      workspaceBody:
        'Use the date slider for active files, active contributors, and live detector events; switch perspective to rewrite the saga from one contributor’s point of view.',
      timeTravel: 'Time travel',
      timeTravelSubtitle: '{date} snapshot · ±30 days',
      activeCommits: 'active commits',
      activeContributors: 'active contributors',
      activeDetectorEvents: 'active detector events',
      activeFiles: 'active files top 10',
      contributorMode: 'Contributor view',
      allContributors: 'All contributors',
      contributorVoice: 'You joined in {firstYear}; across this chronicle you made {commits} commits.',
      perspectiveNote: 'Perspective: {name}. “You joined in {firstYear}…” is applied to overlapping events.',
      contributorNarrativePrefix: 'You joined in {firstYear}. {narrative}',
      yearCommits: 'commits in selected year',
      activeYears: 'active years',
      touchedFiles: 'frequent files',
      topContributorsAtYear: 'Top contributors in {year}',
      evidenceLinks: 'Evidence links',
      evidenceLinkKinds: {
        commit: 'commit',
        compare: 'compare',
        search: 'history',
        file: 'file',
      },
      showDebug: 'Why this event?',
      hideDebug: 'Hide debug',
      positiveRoute: 'Positive route:',
      negativeRoute: 'Negative route:',
      threshold: 'threshold',
      distance: 'distance',
      none: 'none detected',
      debugMetricLabels: {},
      debugValueLabels: {},
      severityLabels: {
        minor: 'minor',
        notable: 'notable',
        major: 'major',
        'epoch-defining': 'epoch-defining',
      },
    },
    footer: 'repo-saga · MIT licensed · evidence-first heuristics, no LLMs in the loop',
  },
  zh: {
    toolbar: {
      theme: '主题',
      language: '语言',
      themeLabels: {
        epic: '史诗',
        'dark-fantasy': '暗黑奇幻',
        academic: '学术',
        minimal: '极简',
      },
      languageLabels: {
        en: 'English',
        zh: '中文',
      },
    },
    form: {
      label: '仓库 URL 或本地路径',
      placeholder: 'https://github.com/user/repo  或  /Users/me/projects/foo',
      working: '生成中...',
      generate: '生成',
      examplesPrefix: '可以试试：',
    },
    errors: {
      jobCreation: '创建任务失败',
      sagaRetrieval: '获取编年史失败',
    },
    hero: {
      kicker: '仓库编年史',
      title: '把任意仓库渲染成一部代码文明史',
      body:
        '粘贴 GitHub URL 或本地路径。repo-saga 会读取 git 历史，用启发式规则识别迁移、重构、发布和工程仪式，再生成有证据支撑的编年史。',
      points: ['完全在本机运行，不调用外部 AI API。', '输出 Markdown、JSON 和可打印的 SVG 海报。', '支持四种编年史主题，并可随时切换中英文。'],
    },
    progress: {
      status: '状态',
      statusLabels: {
        queued: '排队中',
        running: '运行中',
        done: '已完成',
        error: '出错',
      },
      phaseLabels: {
        init: '初始化',
        clone: '克隆',
        'git-log': '读取历史',
        parsing: '解析',
        analysing: '分析',
        detecting: '检测事件',
        eras: '切分纪元',
        rendering: '编译结果',
        done: '完成',
        error: '错误',
      },
    },
    saga: {
      title: '{name} 的文明史',
      commits: '次提交',
      contributors: '位贡献者',
      tags: '个 tag',
      eras: '个纪元',
      events: '个事件',
      downloadSvg: '下载 SVG',
      copyMarkdown: '复制 Markdown',
      copied: '已复制',
      downloadJson: '下载 JSON',
      hideJson: '隐藏 JSON',
      viewJson: '查看 JSON',
      posterAlt: '{name} 的代码文明史海报（{theme} 主题）',
      noEraSelected: '未选择纪元',
      noEvents: '这个纪元没有检测到事件。',
      confidence: '置信度',
      workspaceLabel: '编年史交互控制',
      workspaceKicker: '交互星图',
      workspaceTitle: '拖动任意日期，直接看见 D ±30 天的文件、贡献者和检测器事件',
      workspaceBody:
        '时间旅行滑块会展示该日期 ±30 天语义下的年度快照：活跃文件 top10、活跃贡献者、当时正在发生的 detector 事件；也可以切到某位贡献者视角重写叙事。',
      timeTravel: '时间旅行',
      timeTravelSubtitle: '{date} 快照 · ±30 天',
      activeCommits: '活跃提交',
      activeContributors: '活跃贡献者',
      activeDetectorEvents: '正在发生的事件',
      activeFiles: '活跃文件 top10',
      contributorMode: '角色视角',
      allContributors: '全部贡献者',
      contributorVoice: '你在 {firstYear} 年加入；整段编年史里你贡献了 {commits} 次提交。',
      perspectiveNote: '当前视角：{name}。与 ta 时间线重叠的事件会以“你在 {firstYear} 年加入……”重写。',
      contributorNarrativePrefix: '你在 {firstYear} 年加入。{narrative}',
      yearCommits: '所选年份提交',
      activeYears: '活跃年份',
      touchedFiles: '常触及文件',
      topContributorsAtYear: '{year} 年贡献者 top',
      evidenceLinks: '证据链接',
      evidenceLinkKinds: {
        commit: 'commit',
        compare: 'compare',
        search: '历史',
        file: '文件',
      },
      showDebug: '为什么触发？',
      hideDebug: '收起调试',
      positiveRoute: '正向路径：',
      negativeRoute: '负向路径：',
      threshold: '阈值',
      distance: '距离',
      none: '暂无',
      debugMetricLabels: {
        'founding-window commits': '奠基窗口提交数',
        'founding-window days': '奠基窗口天数',
        'early files touched': '早期触及文件数',
        'first TS-signal year': '首个 TS 信号年份',
        'majority year': '过半年份',
        'latest TS insertions': '最近 TS 插入行',
        'latest JS insertions': '最近 JS 插入行',
        'files in 90-day window': '90 天窗口文件数',
        'renamed files': '重命名文件数',
        'purged files': '清理文件数',
        'famine span': '饥荒跨度',
        'worst test ratio': '最低测试比例',
        'worst year': '最低年份',
        'test tool signals': '测试工具信号数',
        'surge from': '跃升前',
        'surge to': '跃升后',
        'lint signals': 'Lint 信号数',
        'severity upgrade': '强度升级',
        'container/IaC signals': '容器/IaC 信号数',
        'workspace signals': '工作区信号数',
        'packages/ present': '存在 packages/',
        'apps/ present': '存在 apps/',
        'largest lockfile churn': '最大 lockfile 变动',
        'heavy dependency commits': '重依赖变动提交数',
        'founder candidates': '创始人候选数',
        'exited founders': '离开的创始人',
        'last-quartile cutoff': '最后四分位切点',
        'late contributors surfaced': '后期贡献者数',
        'newcomer threshold': '新人阈值',
        'AI keyword hits': 'AI 关键词命中',
        'first hit': '首次命中',
        'bug-themed commits': 'Bug 主题提交',
        'bug-themed ratio': 'Bug 主题比例',
        'month total commits': '该月总提交',
        'dated tags': '带日期 tag 数',
        'SemVer-ish tags': 'SemVer 风格 tag',
        'release span': '发布跨度',
      },
      debugValueLabels: {
        'not crossed': '未越过',
        'n/a': '不适用',
        'yes': '是',
        'no': '否',
        'major': '重大',
        'notable': '显著',
        'minor': '轻微',
      },
      severityLabels: {
        minor: '轻微',
        notable: '显著',
        major: '重大',
        'epoch-defining': '定义纪元',
      },
    },
    footer: 'repo-saga · MIT 许可 · 基于证据的启发式分析，不依赖 LLM',
  },
};

function withLanguageLabels(copy: UiCopy, uiLang: 'en' | 'zh'): UiCopy {
  return {
    ...copy,
    toolbar: {
      ...copy.toolbar,
      languageLabels: Object.fromEntries(
        LANGS.map((lang) => [lang, languageLabel(lang, uiLang)]),
      ) as Record<UiLang, string>,
    },
  };
}

export const UI_COPY: Record<UiLang, UiCopy> = Object.fromEntries(
  LANGS.map((lang) => {
    const base = lang === 'zh' || lang === 'zh-Hant' ? UI_COPY_BASE.zh : UI_COPY_BASE.en;
    const uiLang = lang === 'zh' || lang === 'zh-Hant' ? 'zh' : 'en';
    return [lang, withLanguageLabels(base, uiLang)];
  }),
) as Record<UiLang, UiCopy>;

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function formatNumber(value: number, lang: UiLang): string {
  return value.toLocaleString(lang === 'zh-Hant' ? 'zh-TW' : lang.replace('_', '-'));
}

export function localizeError(message: string, lang: UiLang): string {
  if (lang !== 'zh' && lang !== 'zh-Hant') return message;
  return message
    .replace('Job creation failed', UI_COPY.zh.errors.jobCreation)
    .replace('Saga retrieval failed', UI_COPY.zh.errors.sagaRetrieval)
    .replace('Missing "source" (repo URL or local path)', '缺少来源（仓库 URL 或本地路径）')
    .replace('Job not found', '未找到任务')
    .replace('Saga not yet ready', '编年史还没有生成完成')
    .replace('Not a git repository:', '不是 Git 仓库：')
    .replace('Unknown error', '未知错误');
}

export function localizeProgressMessage(event: ProgressEvent, lang: UiLang): string {
  if (lang !== 'zh' && lang !== 'zh-Hant') return event.message;

  const message = event.message;
  const parsed = message.match(/^Parsed ([\d,]+) commits$/);
  if (parsed) return `已解析 ${parsed[1]} 次提交`;

  const resolving = message.match(/^Resolving source: (.+)$/);
  if (resolving) return `解析来源：${resolving[1]}`;

  const cloning = message.match(/^Cloning (.+) into cache…$/);
  if (cloning) return `正在克隆 ${cloning[1]} 到缓存...`;

  const refreshing = message.match(/^Refreshing cached clone at (.+)$/);
  if (refreshing) return `正在刷新缓存克隆：${refreshing[1]}`;

  const discarding = message.match(/^Discarding invalid cached clone at (.+)$/);
  if (discarding) return `正在丢弃无效缓存克隆：${discarding[1]}`;

  const exact: Record<string, string> = {
    'Reading git history…': '正在读取 git 历史...',
    'Aggregating yearly stats…': '正在汇总年度统计...',
    'Running heuristic detectors…': '正在运行启发式检测器...',
    'Carving the timeline into eras…': '正在切分时间线纪元...',
    'Compiling saga…': '正在编译编年史...',
    'Saga complete.': '编年史生成完成。',
    'Saga complete': '编年史生成完成。',
    'Saga delivered from CLI': '已载入 CLI 提供的编年史。',
  };

  return exact[message] ?? message;
}

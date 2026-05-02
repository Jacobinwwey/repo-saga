import type { EventSeverity, ProgressEvent } from '@repo-saga/core';
import type { ThemeName } from './theme';

export type UiLang = 'en' | 'zh';

type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface UiCopy {
  toolbar: {
    theme: string;
    language: string;
    themeLabels: Record<ThemeName, string>;
    languageLabels: Record<UiLang, string>;
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
    severityLabels: Record<EventSeverity, string>;
  };
  footer: string;
}

export const LANGS: UiLang[] = ['zh', 'en'];

export const UI_COPY: Record<UiLang, UiCopy> = {
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

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function formatNumber(value: number, lang: UiLang): string {
  return value.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
}

export function localizeError(message: string, lang: UiLang): string {
  if (lang === 'en') return message;
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
  if (lang === 'en') return event.message;

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

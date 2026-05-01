import type { DetectedEvent, Era, Saga } from '@repo-saga/core';
import {
  composeEraSummary,
  label,
  translateEra,
  translateEventTitle,
  translateEvidence,
  type Lang,
} from './i18n.js';

export type SvgTheme = 'epic' | 'dark-fantasy' | 'academic' | 'minimal';

interface ThemePalette {
  bg: string;
  paper: string;
  paperBorder: string;
  ink: string;
  inkSoft: string;
  accent: string;
  muted: string;
  band: string;
  eraColors: string[];
  fontTitle: string;
  fontBody: string;
}

// Chinese / CJK fallbacks appended to every theme so 中文 commit
// messages, repo names, and the zh locale render natively.
const CJK_SERIF = '"Source Han Serif SC", "Source Han Serif", "Noto Serif CJK SC", "Songti SC", "STSong", "SimSun"';
const CJK_SANS = '"PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "Heiti SC"';

const THEMES: Record<SvgTheme, ThemePalette> = {
  epic: {
    bg: '#efe2c1',
    paper: '#f5e8c8',
    paperBorder: '#9a7e4a',
    ink: '#3a2a1a',
    inkSoft: '#5a4528',
    accent: '#a3471c',
    muted: '#8b6e3a',
    band: '#dcc792',
    eraColors: ['#a3471c', '#7c5b2c', '#5d8a3a', '#3b6b8b', '#7a3b8b', '#8b3b3b', '#3b8b6b'],
    fontTitle: `"Cormorant Garamond", "Iowan Old Style", "Palatino", Georgia, ${CJK_SERIF}, serif`,
    fontBody: `"Iowan Old Style", "Palatino", Georgia, ${CJK_SERIF}, serif`,
  },
  'dark-fantasy': {
    bg: '#0a0c1d',
    paper: '#15182d',
    paperBorder: '#2c3a6b',
    ink: '#e8eaff',
    inkSoft: '#9aa3d7',
    accent: '#f6c12a',
    muted: '#7c83b3',
    band: '#1c2240',
    eraColors: ['#ff6b6b', '#ffa94d', '#fcd34d', '#a7f3d0', '#7dd3fc', '#c084fc', '#f472b6'],
    fontTitle: `"Cinzel", "Trajan Pro", Georgia, ${CJK_SERIF}, serif`,
    fontBody: `Inter, system-ui, "Segoe UI", ${CJK_SANS}, sans-serif`,
  },
  academic: {
    bg: '#fdfdfa',
    paper: '#ffffff',
    paperBorder: '#cccccc',
    ink: '#1f2937',
    inkSoft: '#4b5563',
    accent: '#9c1f2e',
    muted: '#6b7280',
    band: '#f3f4f6',
    eraColors: ['#9c1f2e', '#374151', '#0e7490', '#15803d', '#a16207', '#7c3aed', '#be185d'],
    fontTitle: `"Source Serif 4", "Iowan Old Style", Georgia, ${CJK_SERIF}, serif`,
    fontBody: `Georgia, "Times New Roman", ${CJK_SERIF}, serif`,
  },
  minimal: {
    bg: '#ffffff',
    paper: '#fafaf9',
    paperBorder: '#e5e5e5',
    ink: '#111111',
    inkSoft: '#444444',
    accent: '#111111',
    muted: '#888888',
    band: '#f4f4f3',
    eraColors: ['#111', '#3a3a3a', '#5d5d5d', '#7e7e7e', '#9c9c9c', '#b8b8b8', '#d4d4d4'],
    fontTitle: `"Inter", system-ui, ${CJK_SANS}, sans-serif`,
    fontBody: `"Inter", system-ui, ${CJK_SANS}, sans-serif`,
  },
};

export interface SvgOptions {
  theme?: SvgTheme;
  width?: number;
  /** maximum number of events drawn inside each era card (default 6) */
  maxEventsPerEra?: number;
  /** rendering language: 'en' (default) or 'zh' */
  lang?: Lang;
}

export function renderSvg(saga: Saga, opts: SvgOptions = {}): string {
  const theme = THEMES[opts.theme ?? 'epic'];
  const width = opts.width ?? 1600;
  const maxEvents = opts.maxEventsPerEra ?? 6;
  const lang: Lang = opts.lang ?? 'en';

  const headerH = 240;
  const timelineH = 110;
  const eraH = 240;
  const footerH = 140;
  const eras = saga.eras.length > 0 ? saga.eras : [defaultEra(saga)];
  const totalH = headerH + timelineH + eras.length * eraH + footerH;
  const margin = 32;

  const sb: string[] = [];
  sb.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalH}" width="${width}" height="${totalH}" font-family=${attr(theme.fontBody)}>`,
  );
  sb.push(makeDefs(theme));
  // background
  sb.push(`<rect width="100%" height="100%" fill="${theme.bg}"/>`);

  // outer parchment frame
  sb.push(
    `<rect x="${margin / 2}" y="${margin / 2}" width="${width - margin}" height="${totalH - margin}" rx="12" ry="12" fill="${theme.paper}" stroke="${theme.paperBorder}" stroke-width="2"/>`,
  );

  // decorative inner border
  sb.push(
    `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${totalH - margin * 2}" rx="6" ry="6" fill="none" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="2 6" opacity="0.6"/>`,
  );

  // header
  sb.push(renderHeader(saga, theme, width, headerH, margin, lang));

  // year axis / timeline
  sb.push(
    renderTimelineStrip(
      saga,
      eras as Era[],
      theme,
      width,
      margin,
      headerH,
      timelineH,
      lang,
    ),
  );

  // era cards
  let y = headerH + timelineH;
  for (let i = 0; i < eras.length; i++) {
    sb.push(
      renderEra(
        eras[i],
        saga.events,
        theme,
        width,
        margin,
        y,
        eraH,
        i,
        maxEvents,
        lang,
      ),
    );
    y += eraH;
  }

  // footer
  sb.push(renderFooter(saga, theme, width, totalH, margin, footerH, lang));

  sb.push('</svg>');
  return sb.join('\n');
}

function defaultEra(saga: Saga): Era {
  return {
    id: 'era-1',
    name: 'Founding Era: A Chronicle Begins',
    startYear: yearOf(saga.repo.firstCommitDate),
    endYear: yearOf(saga.repo.lastCommitDate),
    theme: 'no events were detected, but every chronicle has a beginning',
    summary: `${saga.repo.commitCount} commits, ${saga.repo.contributors} contributors.`,
    summaryStats: {
      commits: saga.repo.commitCount,
      contributors: saga.repo.contributors,
      insertions: 0,
      deletions: 0,
    },
    dominantEvents: [],
    evidence: [],
  };
}

function makeDefs(theme: ThemePalette): string {
  return [
    '<defs>',
    `<linearGradient id="paperShade" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${theme.paper}" stop-opacity="1"/>`,
    `<stop offset="100%" stop-color="${theme.band}" stop-opacity="1"/>`,
    `</linearGradient>`,
    `<linearGradient id="bandFade" x1="0" y1="0" x2="1" y2="0">`,
    `<stop offset="0%" stop-color="${theme.muted}" stop-opacity="0.0"/>`,
    `<stop offset="50%" stop-color="${theme.muted}" stop-opacity="0.65"/>`,
    `<stop offset="100%" stop-color="${theme.muted}" stop-opacity="0.0"/>`,
    `</linearGradient>`,
    '</defs>',
  ].join('');
}

function renderHeader(
  saga: Saga,
  theme: ThemePalette,
  width: number,
  headerH: number,
  margin: number,
  lang: Lang,
): string {
  const cx = width / 2;
  const titleY = margin + 70;
  const subtitleY = titleY + 40;
  const ornamentY = titleY + 80;

  const decorationLeft = `<path d="M ${margin + 10} ${ornamentY} q 60 -30 120 0 q 60 30 120 0 q 60 -30 120 0" stroke="${theme.muted}" stroke-width="1.4" fill="none"/>`;
  const decorationRight = `<path d="M ${width - margin - 370} ${ornamentY} q 60 -30 120 0 q 60 30 120 0 q 60 -30 120 0" stroke="${theme.muted}" stroke-width="1.4" fill="none"/>`;

  const stars = `★ · ✦ · ★`;
  const title = label(lang, 'civilizationOf', { name: saga.repo.name });
  const subtitle = label(lang, 'poster_subtitle', {
    period: `${shortYear(saga.repo.firstCommitDate)} — ${shortYear(saga.repo.lastCommitDate)}`,
    commits: saga.repo.commitCount.toLocaleString(),
    contributors: saga.repo.contributors,
    tags: saga.repo.tagCount,
  });
  const tagline = label(lang, 'posterTagline');

  return [
    decorationLeft,
    decorationRight,
    `<text x="${cx}" y="${titleY}" text-anchor="middle" font-family=${attr(theme.fontTitle)} font-size="48" font-weight="700" fill="${theme.ink}" letter-spacing="0.5">${escapeXml(title)}</text>`,
    `<text x="${cx}" y="${subtitleY}" text-anchor="middle" font-size="18" fill="${theme.inkSoft}">${escapeXml(subtitle)}</text>`,
    `<text x="${cx}" y="${ornamentY + 40}" text-anchor="middle" font-size="22" fill="${theme.accent}" letter-spacing="6">${stars}</text>`,
    `<text x="${cx}" y="${ornamentY + 70}" text-anchor="middle" font-size="13" fill="${theme.muted}" letter-spacing="3">${escapeXml(tagline)}</text>`,
  ].join('');
}

function renderTimelineStrip(
  saga: Saga,
  eras: Era[],
  theme: ThemePalette,
  width: number,
  margin: number,
  startY: number,
  height: number,
  lang: Lang,
): string {
  const x0 = margin + 60;
  const x1 = width - margin - 60;
  const w = x1 - x0;
  const startYear = yearOf(saga.repo.firstCommitDate);
  const endYear = yearOf(saga.repo.lastCommitDate);
  const spanYears = Math.max(1, endYear - startYear);

  const trackY = startY + height / 2;
  const out: string[] = [];

  // baseline
  out.push(`<line x1="${x0}" y1="${trackY}" x2="${x1}" y2="${trackY}" stroke="${theme.inkSoft}" stroke-width="1.2"/>`);

  // era segments as colored arcs
  for (let i = 0; i < eras.length; i++) {
    const era = eras[i];
    const ex0 = x0 + ((era.startYear - startYear) / spanYears) * w;
    const exEnd = x0 + ((era.endYear + 1 - startYear) / spanYears) * w;
    const color = theme.eraColors[i % theme.eraColors.length];
    out.push(
      `<rect x="${ex0}" y="${trackY - 10}" width="${Math.max(2, exEnd - ex0)}" height="20" fill="${color}" opacity="0.25" />`,
    );
    out.push(
      `<rect x="${ex0}" y="${trackY - 4}" width="${Math.max(2, exEnd - ex0)}" height="8" fill="${color}" opacity="0.85" />`,
    );
    // era label above
    const labelX = (ex0 + exEnd) / 2;
    const localized = translateEra(era, saga.events, lang);
    out.push(
      `<text x="${labelX}" y="${trackY - 24}" text-anchor="middle" font-size="11" fill="${theme.inkSoft}" font-weight="600">${escapeXml(eraShortName(localized.name))}</text>`,
    );
    // era roman numeral below
    out.push(
      `<text x="${labelX}" y="${trackY + 32}" text-anchor="middle" font-size="11" fill="${theme.muted}" letter-spacing="2">${toRoman(i + 1)}</text>`,
    );
  }

  // year ticks: start with the requested density, then dedupe so labels never
  // collide. Two safeguards: (a) drop a tick if its year duplicates the
  // previous tick's year (Math.round can yield runs like 2020,2020,2021);
  // (b) drop a tick if it lands within ~28px of the previous label, which
  // keeps adjacent years like "2020 2021" from kissing.
  const requested = Math.min(8, Math.max(2, spanYears + 1));
  const minLabelGap = 28;
  let lastYear = -Infinity;
  let lastX = -Infinity;
  for (let i = 0; i < requested; i++) {
    const yearAtTick = startYear + Math.round((i / (requested - 1)) * spanYears);
    const tx = x0 + ((yearAtTick - startYear) / spanYears) * w;
    if (yearAtTick === lastYear) continue;
    if (tx - lastX < minLabelGap) continue;
    lastYear = yearAtTick;
    lastX = tx;
    out.push(
      `<line x1="${tx}" y1="${trackY + 10}" x2="${tx}" y2="${trackY + 16}" stroke="${theme.inkSoft}" stroke-width="1"/>`,
    );
    out.push(
      `<text x="${tx}" y="${trackY + 32}" text-anchor="middle" font-size="11" fill="${theme.inkSoft}">${yearAtTick}</text>`,
    );
  }
  return out.join('');
}

function renderEra(
  era: Era,
  events: DetectedEvent[],
  theme: ThemePalette,
  width: number,
  margin: number,
  y: number,
  height: number,
  index: number,
  maxEvents: number,
  lang: Lang,
): string {
  const cardX = margin + 20;
  const cardY = y + 10;
  const cardW = width - 2 * margin - 40;
  const cardH = height - 20;
  const color = theme.eraColors[index % theme.eraColors.length];
  const out: string[] = [];

  // card background
  out.push(
    `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="10" ry="10" fill="${theme.paper}" stroke="${theme.paperBorder}" stroke-width="1.4"/>`,
  );
  out.push(
    `<rect x="${cardX}" y="${cardY}" width="6" height="${cardH}" rx="3" ry="3" fill="${color}" opacity="0.95"/>`,
  );

  // roman numeral
  const numeralX = cardX + 50;
  const numeralY = cardY + 64;
  out.push(
    `<text x="${numeralX}" y="${numeralY}" font-family=${attr(theme.fontTitle)} font-size="56" font-weight="700" fill="${color}" opacity="0.85">${toRoman(index + 1)}</text>`,
  );

  const localized = translateEra(era, events, lang);

  // era name + years
  const nameX = cardX + 130;
  const nameY = cardY + 50;
  out.push(
    `<text x="${nameX}" y="${nameY}" font-family=${attr(theme.fontTitle)} font-size="28" font-weight="700" fill="${theme.ink}">${escapeXml(localized.name)}</text>`,
  );
  out.push(
    `<text x="${nameX}" y="${nameY + 26}" font-size="14" fill="${theme.inkSoft}" font-style="italic">${era.startYear}–${era.endYear}  ·  ${escapeXml(localized.theme)}</text>`,
  );

  // summary (wrapped) — uses the per-line char budget tuned to the script.
  const summaryWidth = lang === 'zh' ? 50 : 100;
  const summaryLines = wrapText(composeEraSummary(era, events, lang), summaryWidth);
  for (let i = 0; i < Math.min(2, summaryLines.length); i++) {
    out.push(
      `<text x="${nameX}" y="${nameY + 56 + i * 18}" font-size="13" fill="${theme.ink}">${escapeXml(summaryLines[i])}</text>`,
    );
  }

  // events list (right column)
  const evX = cardX + cardW * 0.55;
  const evY = cardY + 30;
  const eventsInEra = events
    .filter((ev) => ev.endYear >= era.startYear && ev.startYear <= era.endYear)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEvents);

  out.push(
    `<text x="${evX}" y="${evY}" font-size="12" fill="${theme.muted}" letter-spacing="2">${escapeXml(label(lang, 'definingEvents'))}</text>`,
  );
  let lineY = evY + 24;
  if (eventsInEra.length === 0) {
    out.push(
      `<text x="${evX}" y="${lineY}" font-size="13" fill="${theme.inkSoft}" font-style="italic">${escapeXml(label(lang, 'quietStretch'))}</text>`,
    );
  } else {
    for (const ev of eventsInEra) {
      const dot = `<circle cx="${evX + 6}" cy="${lineY - 4}" r="5" fill="${color}" stroke="${theme.ink}" stroke-width="0.6"/>`;
      const range = ev.startYear === ev.endYear ? `${ev.startYear}` : `${ev.startYear}–${ev.endYear}`;
      const localizedTitle = translateEventTitle(ev.type, lang);
      out.push(dot);
      out.push(
        `<text x="${evX + 18}" y="${lineY}" font-size="14" font-weight="600" fill="${theme.ink}">${escapeXml(localizedTitle)} <tspan fill="${theme.muted}" font-weight="400">  · ${range}</tspan></text>`,
      );
      const hintRaw = ev.evidence[0] ?? ev.narrative;
      const hint = translateEvidence(hintRaw, lang);
      const hintWidth = lang === 'zh' ? 36 : 70;
      const hintLines = wrapText(hint, hintWidth);
      out.push(
        `<text x="${evX + 18}" y="${lineY + 16}" font-size="11" fill="${theme.inkSoft}">${escapeXml(hintLines[0] ?? '')}</text>`,
      );
      lineY += 36;
      if (lineY > cardY + cardH - 24) break;
    }
  }

  return out.join('');
}

function renderFooter(
  saga: Saga,
  theme: ThemePalette,
  width: number,
  totalH: number,
  margin: number,
  footerH: number,
  lang: Lang,
): string {
  const y = totalH - footerH;
  const cx = width / 2;
  const out: string[] = [];
  out.push(
    `<line x1="${margin + 40}" y1="${y + 30}" x2="${width - margin - 40}" y2="${y + 30}" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="2 6"/>`,
  );

  const topLangs = saga.stats.languagesByYear
    ? Object.entries(saga.stats.languagesByYear)
        .flatMap(([, lm]) => Object.entries(lm))
        .reduce((acc, [ext, n]) => ((acc[ext] = (acc[ext] ?? 0) + n), acc), {} as Record<string, number>)
    : {};
  const topLangsList = Object.entries(topLangs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext]) => `.${ext}`)
    .join('  ·  ');

  out.push(
    `<text x="${cx}" y="${y + 60}" text-anchor="middle" font-size="14" fill="${theme.inkSoft}">${escapeXml(label(lang, 'topLanguages', { value: topLangsList || '—' }))}</text>`,
  );
  const top = saga.stats.topContributors.slice(0, 5);
  if (top.length > 0) {
    const text = top.map((c) => `${c.name || c.email} (${c.commits.toLocaleString()})`).join('  ·  ');
    out.push(
      `<text x="${cx}" y="${y + 84}" text-anchor="middle" font-size="13" fill="${theme.inkSoft}">${escapeXml(label(lang, 'stewards', { value: text }))}</text>`,
    );
  }
  out.push(
    `<text x="${cx}" y="${y + footerH - 16}" text-anchor="middle" font-size="11" fill="${theme.muted}" letter-spacing="3">${escapeXml(label(lang, 'posterFooter', { version: saga.meta.generatorVersion, date: saga.repo.analyzedAt.slice(0, 10) }))}</text>`,
  );
  return out.join('');
}

// ---- helpers --------------------------------------------------------------

function escapeXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function attr(s: string): string {
  return `"${s.replace(/"/g, '&quot;')}"`;
}

function shortYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 4);
  return String(d.getUTCFullYear());
}

function yearOf(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().getFullYear();
  return d.getUTCFullYear();
}

function eraShortName(name: string): string {
  // "Ancient Era: Initial Chaos" -> "Ancient Era"; works for both ":" and "："
  const colon = Math.max(name.indexOf(':'), name.indexOf('：'));
  return colon > 0 ? name.slice(0, colon) : name;
}

function toRoman(n: number): string {
  if (n <= 0) return '';
  const map: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let out = '';
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out;
}

export function wrapText(input: string, charsPerLine: number): string[] {
  const out: string[] = [];
  const words = String(input ?? '').split(/\s+/).filter(Boolean);
  let line = '';
  const flush = () => {
    if (line) {
      out.push(line);
      line = '';
    }
  };
  const pushChunk = (chunk: string) => {
    if (chunk.length > charsPerLine) {
      // hard-break runs longer than the budget (typical for CJK text without spaces)
      flush();
      for (let i = 0; i < chunk.length; i += charsPerLine) {
        const slice = chunk.slice(i, i + charsPerLine);
        if (i + charsPerLine < chunk.length) {
          out.push(slice);
        } else {
          line = slice;
        }
      }
      return;
    }
    if (!line) {
      line = chunk;
    } else if (line.length + 1 + chunk.length > charsPerLine) {
      out.push(line);
      line = chunk;
    } else {
      line = `${line} ${chunk}`;
    }
  };
  for (const w of words) pushChunk(w);
  flush();
  return out;
}

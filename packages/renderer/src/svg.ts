import type { DetectedEvent, Era, EventType, Saga } from '@repo-saga/core';
import {
  composeEraSummary,
  label,
  translateEra,
  translateEventTitle,
  translateEvidence,
  type Lang,
} from './i18n.js';
import { RASTER_ICON_DATA, type RasterIconName } from './raster-assets.js';

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
const CJK_SERIF =
  '"Source Han Serif SC", "Source Han Serif", "Noto Serif CJK SC", "Songti SC", "STSong", "SimSun"';
const CJK_SANS =
  '"PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "Heiti SC"';

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

  const headerH = 300;
  const timelineH = 110;
  const eraH = 240;
  const footerH = 220;
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
  sb.push(
    `<rect x="${margin / 2}" y="${margin / 2}" width="${width - margin}" height="${totalH - margin}" rx="12" ry="12" fill="url(#paperGrain)" opacity="0.32"/>`,
  );
  sb.push(renderCartography(theme, width, totalH, margin));

  // decorative inner border
  sb.push(
    `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${totalH - margin * 2}" rx="6" ry="6" fill="none" stroke="${theme.muted}" stroke-width="1" stroke-dasharray="2 6" opacity="0.6"/>`,
  );
  sb.push(renderCornerFlourishes(width, totalH, margin));

  // header
  sb.push(renderHeader(saga, theme, width, headerH, margin, lang));

  // year axis / timeline
  sb.push(renderTimelineStrip(saga, eras as Era[], theme, width, margin, headerH, timelineH, lang));

  // era cards
  let y = headerH + timelineH;
  for (let i = 0; i < eras.length; i++) {
    sb.push(renderEra(eras[i], saga.events, theme, width, margin, y, eraH, i, maxEvents, lang));
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
    '<pattern id="paperGrain" width="96" height="96" patternUnits="userSpaceOnUse">',
    `<rect width="96" height="96" fill="${theme.paper}"/>`,
    `<circle cx="12" cy="18" r="1.1" fill="${theme.muted}" opacity="0.16"/>`,
    `<circle cx="58" cy="27" r="0.8" fill="${theme.inkSoft}" opacity="0.12"/>`,
    `<circle cx="84" cy="72" r="1.2" fill="${theme.muted}" opacity="0.11"/>`,
    `<path d="M 8 82 q 24 -12 46 2 t 38 -5" stroke="${theme.muted}" stroke-width="0.7" fill="none" opacity="0.08"/>`,
    '</pattern>',
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

function renderCartography(
  theme: ThemePalette,
  width: number,
  totalH: number,
  margin: number,
): string {
  const left = margin + 80;
  const right = width - margin - 260;
  const out: string[] = [];
  out.push(
    `<path d="M ${left} 116 q 90 -55 180 -10 t 165 4 t 190 -20" stroke="${theme.muted}" stroke-width="1" fill="none" opacity="0.12"/>`,
  );
  out.push(
    `<path d="M ${width - margin - 430} 92 l 34 44 l 26 -32 l 38 56 l 28 -34 l 64 76" stroke="${theme.muted}" stroke-width="1" fill="none" opacity="0.13"/>`,
  );
  out.push(
    `<path d="M ${margin + 120} ${totalH - 280} q 150 -60 290 -6 t 330 -18 t 410 8" stroke="${theme.muted}" stroke-width="1" fill="none" opacity="0.1"/>`,
  );
  out.push(
    `<path d="M ${right} ${totalH - 240} q -44 28 -95 0 q -56 -32 -112 8" stroke="${theme.muted}" stroke-width="1" fill="none" opacity="0.12"/>`,
  );
  out.push(renderRasterIcon('compass', width - margin - 220, margin + 72, 130, 130, 0.13));
  return `<g aria-hidden="true">${out.join('')}</g>`;
}

function renderCornerFlourishes(width: number, totalH: number, margin: number): string {
  const size = 98;
  const corner = (x: number, y: number, sx: number, sy: number) =>
    `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${renderRasterIcon('corner', 0, 0, size, size, 0.42)}</g>`;
  return [
    corner(margin / 2 + size + 4, margin / 2 + 4, -1, 1),
    corner(width - margin / 2 - size - 4, margin / 2 + 4, 1, 1),
    corner(margin / 2 + size + 4, totalH - margin / 2 - 4, -1, -1),
    corner(width - margin / 2 - size - 4, totalH - margin / 2 - 4, 1, -1),
  ].join('');
}

type EraVisual = 'temple' | 'scroll' | 'ts' | 'castle' | 'oracle' | 'container' | 'storm' | 'tag';

const VISUAL_BY_EVENT: Partial<Record<EventType, EraVisual>> = {
  'initial-chaos': 'temple',
  'testing-famine': 'scroll',
  'testing-renaissance': 'scroll',
  'typescript-invasion': 'ts',
  'great-refactor-war': 'scroll',
  'linting-theocracy': 'scroll',
  'container-empire': 'container',
  'monorepo-federation': 'castle',
  'dependency-cataclysm': 'storm',
  'founder-exodus': 'temple',
  'new-dynasty': 'castle',
  'ai-priesthood': 'oracle',
  'bug-plague': 'storm',
  'release-empire': 'tag',
};

function pickEraVisual(era: Era, events: DetectedEvent[]): EraVisual {
  const eventVisual = events.map((ev) => VISUAL_BY_EVENT[ev.type]).find(Boolean);
  if (eventVisual) return eventVisual;

  const text = `${era.name} ${era.theme}`.toLowerCase();
  if (text.includes('type') || text.includes('typescript')) return 'ts';
  if (text.includes('federation') || text.includes('monorepo')) return 'castle';
  if (text.includes('oracle') || text.includes('ai')) return 'oracle';
  if (text.includes('container')) return 'container';
  if (text.includes('release')) return 'tag';
  return 'temple';
}

function renderEraScene(visual: EraVisual, x: number, y: number): string {
  return renderRasterIcon(iconForVisual(visual), x, y + 26, 240, 164, 0.72);
}

function renderTimelineIcon(visual: EraVisual, cx: number, y: number): string {
  return renderRasterIcon(iconForVisual(visual), cx - 46, y, 92, 64, 0.58);
}

function iconForVisual(visual: EraVisual): RasterIconName {
  const icons: Record<EraVisual, RasterIconName> = {
    temple: 'temple',
    scroll: 'scroll',
    ts: 'tablet',
    castle: 'castle',
    oracle: 'oracle',
    container: 'castle',
    storm: 'scroll',
    tag: 'tag',
  };
  return icons[visual];
}

function renderRasterIcon(
  icon: RasterIconName,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity: number,
): string {
  return `<image href="${RASTER_ICON_DATA[icon]}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>`;
}

function renderMetricBlock(
  x: number,
  y: number,
  width: number,
  icon: 'quill' | 'people' | 'tag' | 'laurel',
  value: string,
  caption: string,
  theme: ThemePalette,
): string {
  const valueMaxW = width - 104;
  const captionMaxW = width - 104;
  const valueBaseSize = value.length > 14 ? 17 : value.length > 8 ? 21 : 27;
  const fittedValue = fitTextLine(value, valueBaseSize, valueMaxW, 11);
  const fittedCaption = fitTextLine(caption, 12, captionMaxW, 9);
  return `
    <g transform="translate(${x} ${y})">
      <path d="M 0 34 q 18 -34 54 -34 h ${width - 108} q 36 0 54 34 q -18 34 -54 34 H 54 q -36 0 -54 -34 Z" fill="${theme.paper}" stroke="${theme.muted}" stroke-width="1.2" opacity="0.82"/>
      ${renderMetricIcon(icon, 34, 34)}
      <text x="84" y="29" font-family=${attr(theme.fontTitle)} font-size="${fittedValue.fontSize}" font-weight="700" fill="${theme.ink}">${escapeXml(fittedValue.text)}</text>
      <text x="84" y="50" font-size="${fittedCaption.fontSize}" fill="${theme.muted}" letter-spacing="2">${escapeXml(fittedCaption.text)}</text>
    </g>`;
}

function renderMetricIcon(
  icon: 'quill' | 'people' | 'tag' | 'laurel',
  cx: number,
  cy: number,
): string {
  const iconMap: Record<typeof icon, RasterIconName> = {
    quill: 'quill',
    people: 'people',
    tag: 'tag',
    laurel: 'laurel',
  };
  const sizes: Record<typeof icon, { w: number; h: number; opacity: number }> = {
    quill: { w: 58, h: 58, opacity: 0.74 },
    people: { w: 58, h: 44, opacity: 0.72 },
    tag: { w: 48, h: 58, opacity: 0.76 },
    laurel: { w: 46, h: 58, opacity: 0.72 },
  };
  const size = sizes[icon];
  return renderRasterIcon(
    iconMap[icon],
    cx - size.w / 2,
    cy - size.h / 2,
    size.w,
    size.h,
    size.opacity,
  );
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

  const title = label(lang, 'civilizationOf', { name: saga.repo.name });
  const subtitle = label(lang, 'poster_subtitle', {
    period: `${shortYear(saga.repo.firstCommitDate)} — ${shortYear(saga.repo.lastCommitDate)}`,
    commits: saga.repo.commitCount.toLocaleString(),
    contributors: saga.repo.contributors,
    tags: saga.repo.tagCount,
  });
  const tagline = label(lang, 'posterTagline');
  const titleMaxW = width - (margin + 230) * 2;
  const fittedTitle = fitTextLine(title, 48, titleMaxW, 34);
  const fittedSubtitle = fitTextLine(subtitle, 18, titleMaxW, 13);
  const fittedTagline = fitTextLine(tagline, 13, 460, 10);

  return [
    renderRasterIcon('crest', margin + 42, margin + 16, 122, 140, 0.72),
    renderRasterIcon('oracle', width - margin - 210, margin + 36, 170, 118, 0.7),
    decorationLeft,
    decorationRight,
    `<text x="${cx}" y="${titleY}" text-anchor="middle" font-family=${attr(theme.fontTitle)} font-size="${fittedTitle.fontSize}" font-weight="700" fill="${theme.ink}" letter-spacing="0.5">${escapeXml(fittedTitle.text)}</text>`,
    `<text x="${cx}" y="${subtitleY}" text-anchor="middle" font-size="${fittedSubtitle.fontSize}" fill="${theme.inkSoft}">${escapeXml(fittedSubtitle.text)}</text>`,
    renderRasterIcon('ornament', cx - 150, ornamentY + 18, 300, 46, 0.78),
    `<text x="${cx}" y="${ornamentY + 70}" text-anchor="middle" font-size="${fittedTagline.fontSize}" fill="${theme.muted}" letter-spacing="3">${escapeXml(fittedTagline.text)}</text>`,
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
  const displaySpanYears = Math.max(1, endYear - startYear);
  const axisEndYear = endYear + 1;
  const axisSpanYears = Math.max(1, axisEndYear - startYear);
  const scaleYear = (year: number) =>
    x0 + ((Math.min(axisEndYear, Math.max(startYear, year)) - startYear) / axisSpanYears) * w;

  const trackY = startY + height / 2;
  const out: string[] = [];

  // baseline
  out.push(
    `<line x1="${x0}" y1="${trackY}" x2="${x1}" y2="${trackY}" stroke="${theme.inkSoft}" stroke-width="1.2"/>`,
  );

  // era segments as colored arcs
  for (let i = 0; i < eras.length; i++) {
    const era = eras[i];
    const ex0 = scaleYear(era.startYear);
    const exEnd = scaleYear(era.endYear + 1);
    const color = theme.eraColors[i % theme.eraColors.length];
    out.push(
      `<rect x="${ex0}" y="${trackY - 10}" width="${Math.max(2, exEnd - ex0)}" height="20" fill="${color}" opacity="0.25" />`,
    );
    out.push(
      `<rect x="${ex0}" y="${trackY - 4}" width="${Math.max(2, exEnd - ex0)}" height="8" fill="${color}" opacity="0.85" />`,
    );
    // era label above
    const labelX = Math.min(x1 - 86, Math.max(x0 + 86, (ex0 + exEnd) / 2));
    const localized = translateEra(era, saga.events, lang);
    const eventsInEra = saga.events.filter(
      (ev) => ev.endYear >= era.startYear && ev.startYear <= era.endYear,
    );
    out.push(renderTimelineIcon(pickEraVisual(era, eventsInEra), labelX, trackY - 96));
    const labelMaxW = Math.max(76, Math.min(150, w / eras.length - 14));
    const fittedLabel = fitTextLine(eraShortName(localized.name), 11, labelMaxW, 9);
    out.push(
      `<text x="${labelX}" y="${trackY - 24}" text-anchor="middle" font-size="${fittedLabel.fontSize}" fill="${theme.inkSoft}" font-weight="600">${escapeXml(fittedLabel.text)}</text>`,
    );
    // era roman numeral below
    out.push(
      `<text x="${labelX}" y="${trackY + 26}" text-anchor="middle" font-size="10" fill="${theme.muted}" letter-spacing="2">${toRoman(i + 1)}</text>`,
    );
  }

  // year ticks: start with the requested density, then dedupe so labels never
  // collide. Two safeguards: (a) drop a tick if its year duplicates the
  // previous tick's year (Math.round can yield runs like 2020,2020,2021);
  // (b) drop a tick if it lands within ~28px of the previous label, which
  // keeps adjacent years like "2020 2021" from kissing.
  const requested = Math.min(8, Math.max(2, displaySpanYears + 1));
  const minLabelGap = 28;
  let lastYear = -Infinity;
  let lastX = -Infinity;
  for (let i = 0; i < requested; i++) {
    const yearAtTick = startYear + Math.round((i / (requested - 1)) * displaySpanYears);
    const tx = scaleYear(yearAtTick);
    if (yearAtTick === lastYear) continue;
    if (tx - lastX < minLabelGap) continue;
    lastYear = yearAtTick;
    lastX = tx;
    out.push(
      `<line x1="${tx}" y1="${trackY + 10}" x2="${tx}" y2="${trackY + 16}" stroke="${theme.inkSoft}" stroke-width="1"/>`,
    );
    out.push(
      `<text x="${tx}" y="${trackY + 46}" text-anchor="middle" font-size="11" fill="${theme.inkSoft}">${yearAtTick}</text>`,
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
  const eventsInEra = events
    .filter((ev) => ev.endYear >= era.startYear && ev.startYear <= era.endYear)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEvents);
  const sceneX = cardX + cardW - 270;
  out.push(renderEraScene(pickEraVisual(era, eventsInEra), sceneX, cardY + 34));

  // era name + years
  const nameX = cardX + 130;
  const nameY = cardY + 50;
  const evX = cardX + cardW * 0.55;
  const nameMaxW = Math.max(300, evX - nameX - 38);
  const fittedName = fitTextLine(localized.name, 28, nameMaxW, 20);
  const fittedTheme = fitTextLine(`${era.startYear}–${era.endYear}  ·  ${localized.theme}`, 14, nameMaxW, 10);
  out.push(
    `<text x="${nameX}" y="${nameY}" font-family=${attr(theme.fontTitle)} font-size="${fittedName.fontSize}" font-weight="700" fill="${theme.ink}">${escapeXml(fittedName.text)}</text>`,
  );
  out.push(
    `<text x="${nameX}" y="${nameY + 26}" font-size="${fittedTheme.fontSize}" fill="${theme.inkSoft}" font-style="italic">${escapeXml(fittedTheme.text)}</text>`,
  );

  // summary (wrapped) — bounded by the left column, not just a rough char count.
  const summaryLines = wrapTextByWidth(composeEraSummary(era, events, lang), nameMaxW, 13, 2);
  for (let i = 0; i < Math.min(2, summaryLines.length); i++) {
    out.push(
      `<text x="${nameX}" y="${nameY + 56 + i * 18}" font-size="13" fill="${theme.ink}">${escapeXml(summaryLines[i])}</text>`,
    );
  }

  // events list (right column)
  const evY = cardY + 30;
  const evTextMaxW = Math.max(260, sceneX - evX - 30);

  out.push(
    `<text x="${evX}" y="${evY}" font-size="12" fill="${theme.muted}" letter-spacing="2">${escapeXml(fitTextLine(label(lang, 'definingEvents'), 12, evTextMaxW, 10).text)}</text>`,
  );
  let lineY = evY + 24;
  if (eventsInEra.length === 0) {
    const quiet = fitTextLine(label(lang, 'quietStretch'), 13, evTextMaxW, 10);
    out.push(
      `<text x="${evX}" y="${lineY}" font-size="${quiet.fontSize}" fill="${theme.inkSoft}" font-style="italic">${escapeXml(quiet.text)}</text>`,
    );
  } else {
    for (const ev of eventsInEra) {
      const dot = `<circle cx="${evX + 6}" cy="${lineY - 4}" r="5" fill="${color}" stroke="${theme.ink}" stroke-width="0.6"/>`;
      const range =
        ev.startYear === ev.endYear ? `${ev.startYear}` : `${ev.startYear}–${ev.endYear}`;
      const localizedTitle = translateEventTitle(ev.type, lang);
      const titleLine = fitTextLine(`${localizedTitle}  · ${range}`, 14, evTextMaxW - 18, 10);
      out.push(dot);
      out.push(
        `<text x="${evX + 18}" y="${lineY}" font-size="${titleLine.fontSize}" font-weight="600" fill="${theme.ink}">${escapeXml(titleLine.text)}</text>`,
      );
      const hintRaw = ev.evidence[0] ?? ev.narrative;
      const hint = translateEvidence(hintRaw, lang);
      const hintLine = fitTextLine(hint, 11, evTextMaxW - 18, 9);
      out.push(
        `<text x="${evX + 18}" y="${lineY + 16}" font-size="${hintLine.fontSize}" fill="${theme.inkSoft}">${escapeXml(hintLine.text)}</text>`,
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
        .reduce(
          (acc, [ext, n]) => ((acc[ext] = (acc[ext] ?? 0) + n), acc),
          {} as Record<string, number>,
        )
    : {};
  const topLangsList = Object.entries(topLangs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext]) => `.${ext}`)
    .join('  ·  ');

  const metricY = y + 48;
  const gap = 36;
  const metricW = 210;
  const totalMetricW = metricW * 4 + gap * 3;
  const startX = cx - totalMetricW / 2;
  const captions =
    lang === 'zh'
      ? { commits: '提交', contributors: '贡献者', tags: 'TAG', topLanguages: '主要语言' }
      : {
          commits: 'COMMITS',
          contributors: 'CONTRIBUTORS',
          tags: 'TAGS',
          topLanguages: 'TOP LANGUAGES',
        };
  out.push(
    renderMetricBlock(
      startX,
      metricY,
      metricW,
      'quill',
      saga.repo.commitCount.toLocaleString(),
      captions.commits,
      theme,
    ),
  );
  out.push(
    renderMetricBlock(
      startX + metricW + gap,
      metricY,
      metricW,
      'people',
      saga.repo.contributors.toLocaleString(),
      captions.contributors,
      theme,
    ),
  );
  out.push(
    renderMetricBlock(
      startX + (metricW + gap) * 2,
      metricY,
      metricW,
      'tag',
      saga.repo.tagCount.toLocaleString(),
      captions.tags,
      theme,
    ),
  );
  out.push(
    renderMetricBlock(
      startX + (metricW + gap) * 3,
      metricY,
      metricW,
      'laurel',
      topLangsList || '—',
      captions.topLanguages,
      theme,
    ),
  );

  const top = saga.stats.topContributors.slice(0, 5);
  if (top.length > 0) {
    const text = top
      .map((c) => `${c.name || c.email} (${c.commits.toLocaleString()})`)
      .join('  ·  ');
    const stewards = fitTextLine(label(lang, 'stewards', { value: text }), 13, width - margin * 4, 10);
    out.push(
      `<text x="${cx}" y="${y + 156}" text-anchor="middle" font-size="${stewards.fontSize}" fill="${theme.inkSoft}">${escapeXml(stewards.text)}</text>`,
    );
  }
  const topLanguagesLine = fitTextLine(label(lang, 'topLanguages', { value: topLangsList || '—' }), 12, width - margin * 4, 10);
  out.push(
    `<text x="${cx}" y="${y + 132}" text-anchor="middle" font-size="${topLanguagesLine.fontSize}" fill="${theme.muted}" opacity="0.9">${escapeXml(topLanguagesLine.text)}</text>`,
  );
  const posterFooter = fitTextLine(
    label(lang, 'posterFooter', {
      version: saga.meta.generatorVersion,
      date: saga.repo.analyzedAt.slice(0, 10),
    }),
    11,
    width - margin * 4,
    9,
  );
  out.push(
    `<text x="${cx}" y="${y + footerH - 34}" text-anchor="middle" font-size="${posterFooter.fontSize}" fill="${theme.muted}" letter-spacing="3">${escapeXml(posterFooter.text)}</text>`,
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

function fitTextLine(
  input: string,
  fontSize: number,
  maxWidth: number,
  minFontSize = fontSize,
): { text: string; fontSize: number } {
  let size = fontSize;
  const text = String(input ?? '');
  while (size > minFontSize && estimateTextWidth(text, size) > maxWidth) {
    size -= 1;
  }
  return {
    text: truncateTextToWidth(text, size, maxWidth),
    fontSize: size,
  };
}

function wrapTextByWidth(
  input: string,
  maxWidth: number,
  fontSize: number,
  maxLines = Number.POSITIVE_INFINITY,
): string[] {
  const text = String(input ?? '').trim();
  if (!text) return [];

  const tokens = text.includes(' ') ? text.split(/\s+/).filter(Boolean) : Array.from(text);
  const lines: string[] = [];
  let line = '';
  let truncated = false;

  const pushLine = (value: string) => {
    if (!value) return;
    lines.push(value);
  };

  for (const token of tokens) {
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }
    const separator = line && text.includes(' ') ? ' ' : '';
    const candidate = `${line}${separator}${token}`;
    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      line = candidate;
      continue;
    }

    pushLine(line);
    line = '';
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }

    if (estimateTextWidth(token, fontSize) <= maxWidth) {
      line = token;
      continue;
    }

    let chunk = '';
    for (const char of Array.from(token)) {
      const chunkCandidate = `${chunk}${char}`;
      if (estimateTextWidth(chunkCandidate, fontSize) <= maxWidth) {
        chunk = chunkCandidate;
      } else {
        pushLine(chunk);
        chunk = char;
        if (lines.length >= maxLines) {
          truncated = true;
          break;
        }
      }
    }
    line = chunk;
  }

  if (lines.length < maxLines) pushLine(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = truncateTextToWidth(`${lines[lines.length - 1]}…`, fontSize, maxWidth);
  }
  return lines.map((line) => truncateTextToWidth(line, fontSize, maxWidth));
}

function truncateTextToWidth(input: string, fontSize: number, maxWidth: number): string {
  const raw = String(input ?? '');
  if (estimateTextWidth(raw, fontSize) <= maxWidth) return raw;
  const ellipsis = '…';
  const text = raw.endsWith(ellipsis) ? raw.slice(0, -1).trimEnd() : raw;
  const ellipsisWidth = estimateTextWidth(ellipsis, fontSize);
  if (ellipsisWidth >= maxWidth) return ellipsis;

  let out = '';
  for (const char of Array.from(text)) {
    const candidate = `${out}${char}`;
    if (estimateTextWidth(candidate, fontSize) + ellipsisWidth > maxWidth) break;
    out = candidate;
  }
  return `${out.trimEnd()}${ellipsis}`;
}

function estimateTextWidth(input: string, fontSize: number): number {
  let width = 0;
  for (const char of Array.from(String(input ?? ''))) {
    width += estimateGlyphWidth(char, fontSize);
  }
  return width;
}

function estimateGlyphWidth(char: string, fontSize: number): number {
  if (/\s/.test(char)) return fontSize * 0.32;
  if (/[\u2e80-\u9fff\uff00-\uffef]/.test(char)) return fontSize;
  if (/[A-Z0-9]/.test(char)) return fontSize * 0.62;
  if (/[mw@#%&]/.test(char)) return fontSize * 0.78;
  if (/[ilI.,:;|]/.test(char)) return fontSize * 0.32;
  return fontSize * 0.54;
}

export function wrapText(input: string, charsPerLine: number): string[] {
  const out: string[] = [];
  const words = String(input ?? '')
    .split(/\s+/)
    .filter(Boolean);
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

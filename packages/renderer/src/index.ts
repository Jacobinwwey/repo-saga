export { renderJson } from './json.js';
export { renderMarkdown } from './markdown.js';
export type { MarkdownOptions } from './markdown.js';
export { renderSvg, wrapText } from './svg.js';
export type { SvgOptions, SvgTheme } from './svg.js';
export { ALL_LANGS, fallbackLang, isLang, languageLabel, normalizeLang } from './locales.js';
export type { Lang } from './locales.js';
export { eraContainsDate, eventOverlapsEra, formatEraPeriod, formatEventRange } from './periods.js';
export {
  label,
  translateEvent,
  translateEventTitle,
  translateEventNarrative,
  translateEra,
  translateEraProfile,
  translateSeverity,
  translateFallbackTheme,
  translateSaga,
  composeEraSummary,
  translateEvidence,
} from './i18n.js';

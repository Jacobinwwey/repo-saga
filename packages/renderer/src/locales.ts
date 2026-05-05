const SUPPORTED_LANGS = [
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
  'zh-Hant',
] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

export const ALL_LANGS: Lang[] = [...SUPPORTED_LANGS];

const LANG_ALIASES: Record<string, Lang> = {
  zh_hant: 'zh-Hant',
  'zh-hant': 'zh-Hant',
  zh_tw: 'zh-Hant',
  'zh-tw': 'zh-Hant',
  zh_cn: 'zh',
  'zh-cn': 'zh',
};

const LANGUAGE_NAMES: Record<Lang, { native: string; en: string; zh: string }> = {
  en: { native: 'English', en: 'English', zh: '英语' },
  ar: { native: 'العربية', en: 'Arabic', zh: '阿拉伯语' },
  bn: { native: 'বাংলা', en: 'Bengali', zh: '孟加拉语' },
  cs: { native: 'Čeština', en: 'Czech', zh: '捷克语' },
  da: { native: 'Dansk', en: 'Danish', zh: '丹麦语' },
  de: { native: 'Deutsch', en: 'German', zh: '德语' },
  el: { native: 'Ελληνικά', en: 'Greek', zh: '希腊语' },
  es: { native: 'Español', en: 'Spanish', zh: '西班牙语' },
  fi: { native: 'Suomi', en: 'Finnish', zh: '芬兰语' },
  fr: { native: 'Français', en: 'French', zh: '法语' },
  he: { native: 'עברית', en: 'Hebrew', zh: '希伯来语' },
  hi: { native: 'हिन्दी', en: 'Hindi', zh: '印地语' },
  hu: { native: 'Magyar', en: 'Hungarian', zh: '匈牙利语' },
  id: { native: 'Bahasa Indonesia', en: 'Indonesian', zh: '印尼语' },
  it: { native: 'Italiano', en: 'Italian', zh: '意大利语' },
  ja: { native: '日本語', en: 'Japanese', zh: '日语' },
  ko: { native: '한국어', en: 'Korean', zh: '韩语' },
  ms: { native: 'Bahasa Melayu', en: 'Malay', zh: '马来语' },
  nl: { native: 'Nederlands', en: 'Dutch', zh: '荷兰语' },
  no: { native: 'Norsk', en: 'Norwegian', zh: '挪威语' },
  pl: { native: 'Polski', en: 'Polish', zh: '波兰语' },
  pt: { native: 'Português', en: 'Portuguese', zh: '葡萄牙语' },
  ro: { native: 'Română', en: 'Romanian', zh: '罗马尼亚语' },
  ru: { native: 'Русский', en: 'Russian', zh: '俄语' },
  sv: { native: 'Svenska', en: 'Swedish', zh: '瑞典语' },
  th: { native: 'ไทย', en: 'Thai', zh: '泰语' },
  tr: { native: 'Türkçe', en: 'Turkish', zh: '土耳其语' },
  uk: { native: 'Українська', en: 'Ukrainian', zh: '乌克兰语' },
  vi: { native: 'Tiếng Việt', en: 'Vietnamese', zh: '越南语' },
  zh: { native: '简体中文', en: 'Simplified Chinese', zh: '简体中文' },
  'zh-Hant': { native: '繁體中文', en: 'Traditional Chinese', zh: '繁體中文' },
};

export function normalizeLang(raw: string | undefined): Lang | undefined {
  if (!raw) return undefined;
  const key = raw.trim().replace(/_/g, '-').toLowerCase();
  if ((ALL_LANGS as readonly string[]).includes(raw as Lang)) return raw as Lang;
  return LANG_ALIASES[key] ?? (ALL_LANGS as readonly string[]).find((lang) => lang.toLowerCase() === key) as Lang | undefined;
}

export function isLang(value: string | undefined): value is Lang {
  return Boolean(normalizeLang(value));
}

export function fallbackLang(lang: Lang): 'en' | 'zh' {
  return lang === 'zh' || lang === 'zh-Hant' ? 'zh' : 'en';
}

export function languageLabel(lang: Lang, uiLang: 'en' | 'zh' = 'en'): string {
  const entry = LANGUAGE_NAMES[lang];
  return uiLang === 'zh' ? entry.zh : entry.native || entry.en;
}

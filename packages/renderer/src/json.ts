import type { Saga } from '@repo-saga/core';
import { translateSaga } from './i18n.js';
import type { Lang } from './locales.js';

export function renderJson(saga: Saga, opts: { pretty?: boolean; lang?: Lang } = {}): string {
  const localized = opts.lang ? translateSaga(saga, opts.lang) : saga;
  return opts.pretty === false ? JSON.stringify(localized) : JSON.stringify(localized, null, 2);
}

import type { Saga } from '@repo-saga/core';

export function renderJson(saga: Saga, opts: { pretty?: boolean } = {}): string {
  return opts.pretty === false ? JSON.stringify(saga) : JSON.stringify(saga, null, 2);
}

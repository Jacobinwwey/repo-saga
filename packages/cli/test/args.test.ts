import { describe, expect, it } from 'vitest';
import { isJsonStdoutOnly, parseArgs, progressLogger, validateArgs } from '../src/index.js';

describe('CLI args', () => {
  it('recognizes pure JSON mode only when the server is disabled', () => {
    const args = parseArgs(['./repo', '--json', '--no-server']);
    expect(args.source).toBe('./repo');
    expect(args.json).toBe(true);
    expect(args.server).toBe(false);
    expect(isJsonStdoutOnly(args)).toBe(true);
    expect(validateArgs(args)).toBeUndefined();
  });

  it('rejects --json when the preview server is still enabled', () => {
    const args = parseArgs(['./repo', '--json']);
    expect(isJsonStdoutOnly(args)).toBe(false);
    expect(validateArgs(args)).toBe('--json is only supported with --no-server');
  });

  it('accepts non-year timeline slicing flags', () => {
    const args = parseArgs(['./repo', '--granularity', 'quarter']);
    expect(args.source).toBe('./repo');
    expect(args.granularity).toBe('quarter');
    expect(validateArgs(args)).toBeUndefined();
  });

  it('requires a positive bucket size when slicing by days', () => {
    expect(validateArgs(parseArgs(['./repo', '--bucket-days', '14']))).toBe(
      '--bucket-days is only supported with --granularity days',
    );
    expect(validateArgs(parseArgs(['./repo', '--granularity', 'days']))).toBe(
      '--granularity days requires --bucket-days <positive integer>',
    );
    expect(validateArgs(parseArgs(['./repo', '--granularity', 'days', '--bucket-days', '14']))).toBeUndefined();
  });

  it('can route progress output away from stdout', () => {
    const lines: string[] = [];
    const log = progressLogger((line) => lines.push(line));
    log({ phase: 'init', message: 'Resolving source' });
    log({ phase: 'done', message: 'Saga complete', progress: 1 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Resolving source');
    expect(lines[1]).toContain('Saga complete');
  });

  it('accepts README locale language codes used by downstream projects', () => {
    const locales = ['ar', 'ja', 'vi', 'zh_Hant'];

    for (const locale of locales) {
      expect(() => parseArgs(['./repo', '--lang', locale])).not.toThrow();
      expect(parseArgs(['./repo', '--lang', locale]).lang).toBe(locale);
    }
  });
});

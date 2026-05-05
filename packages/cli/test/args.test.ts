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

  it('can route progress output away from stdout', () => {
    const lines: string[] = [];
    const log = progressLogger((line) => lines.push(line));
    log({ phase: 'init', message: 'Resolving source' });
    log({ phase: 'done', message: 'Saga complete', progress: 1 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Resolving source');
    expect(lines[1]).toContain('Saga complete');
  });

  it('parses locale aliases and fixed era split options', () => {
    const args = parseArgs(['./repo', '--lang', 'zh_Hant', '--era-split', 'quarter']);
    expect(args.lang).toBe('zh-Hant');
    expect(args.eraSplit).toBe('quarter');
    expect(validateArgs(args)).toBeUndefined();
  });

  it('requires a positive day window when split is day', () => {
    const args = parseArgs(['./repo', '--era-split', 'day', '--era-days', '14']);
    expect(args.eraSplit).toBe('day');
    expect(args.eraDays).toBe(14);
    expect(validateArgs(args)).toBeUndefined();

    const invalid = parseArgs(['./repo', '--era-split', 'day']);
    expect(validateArgs(invalid)).toBe(
      '--era-days must be a positive integer when --era-split day is used',
    );
  });
});

#!/usr/bin/env node
import { generateSaga, type ProgressEvent, type Saga } from '@repo-saga/core';
import { renderJson, renderMarkdown, renderSvg, translateEra, type Lang, type SvgTheme } from '@repo-saga/renderer';
import { startServer } from '@repo-saga/server';
import kleur from 'kleur';
import open from 'open';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Args {
  source?: string;
  out: string;
  theme: SvgTheme;
  lang: Lang;
  open: boolean;
  server: boolean;
  port?: number;
  maxCommits?: number;
  cacheDir?: string;
  help?: boolean;
  version?: boolean;
  json?: boolean;
}

const VALID_THEMES: SvgTheme[] = ['epic', 'dark-fantasy', 'academic', 'minimal'];
const VALID_LANGS: Lang[] = ['en', 'zh'];

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    out: process.cwd(),
    theme: 'epic',
    lang: 'en',
    open: true,
    server: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-open') args.open = false;
    else if (a === '--no-server') args.server = false;
    else if (a === '--open') args.open = true;
    else if (a === '--out' || a === '-o') args.out = argv[++i];
    else if (a === '--theme' || a === '-t') {
      const t = argv[++i] as SvgTheme;
      if (!VALID_THEMES.includes(t)) {
        die(`Invalid --theme "${t}". Allowed: ${VALID_THEMES.join(', ')}`);
      }
      args.theme = t;
    } else if (a === '--lang' || a === '-l') {
      const l = argv[++i] as Lang;
      if (!VALID_LANGS.includes(l)) {
        die(`Invalid --lang "${l}". Allowed: ${VALID_LANGS.join(', ')}`);
      }
      args.lang = l;
    } else if (a === '--port' || a === '-p') {
      args.port = parseInt(argv[++i], 10);
    } else if (a === '--max-commits') {
      args.maxCommits = parseInt(argv[++i], 10);
    } else if (a === '--cache-dir') {
      args.cacheDir = argv[++i];
    } else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--version' || a === '-V') args.version = true;
    else if (a === '--json') args.json = true;
    else if (!a.startsWith('-')) {
      if (!args.source) args.source = a;
    } else {
      die(`Unknown flag: ${a}`);
    }
  }
  return args;
}

export function validateArgs(args: Args): string | undefined {
  if (args.json && args.server) return '--json is only supported with --no-server';
  return undefined;
}

export function isJsonStdoutOnly(args: Args): boolean {
  return Boolean(args.json && !args.server);
}

function help() {
  const lines = [
    `${kleur.bold('repo-saga')} — render the civilization history of any git repository`,
    '',
    'Usage:',
    `  ${kleur.cyan('repo-saga')}                              Open the local web UI`,
    `  ${kleur.cyan('repo-saga <repo>')}                        Analyse a repo URL or local path`,
    `  ${kleur.cyan('repo-saga <repo> --out ./out')}            Write outputs to a directory`,
    `  ${kleur.cyan('repo-saga <repo> --theme dark-fantasy')}   Choose an SVG theme`,
    `  ${kleur.cyan('repo-saga <repo> --no-open')}              Don't auto-open the browser`,
    `  ${kleur.cyan('repo-saga <repo> --no-server')}            Just write files; don't launch UI`,
    '',
    'Flags:',
    '  --out, -o <dir>          Output directory for saga.json/saga.md/saga.svg (default cwd)',
    `  --theme, -t <name>       SVG theme: ${VALID_THEMES.join(' | ')} (default epic)`,
    `  --lang, -l <code>        Output language: ${VALID_LANGS.join(' | ')} (default en)`,
    '  --port, -p <num>         Port for the local server (default: random)',
    '  --max-commits <num>      Limit commits read for very large repos',
    '  --cache-dir <path>       Where to clone remote repos (default: $TMPDIR/repo-saga-cache)',
    '  --no-open                Skip auto-opening the browser',
    '  --no-server              Do not start the web server (only emit files)',
    '  --json                   Print the saga.json to stdout (when --no-server)',
    '  -h, --help               Show this help',
    '  -V, --version            Print version',
  ];
  console.log(lines.join('\n'));
}

function die(msg: string): never {
  console.error(`${kleur.red('error:')} ${msg}`);
  process.exit(1);
}

async function readVersion(): Promise<string> {
  try {
    const here = new URL('.', import.meta.url);
    const pkgPath = path.resolve(here.pathname, '../package.json');
    const buf = await fs.readFile(pkgPath, 'utf8');
    return JSON.parse(buf).version ?? '0.0.0';
  } catch {
    return '0.1.0';
  }
}

async function writeOutputs(saga: Saga, outDir: string, theme: SvgTheme, lang: Lang) {
  await fs.mkdir(outDir, { recursive: true });
  const json = renderJson(saga);
  const md = renderMarkdown(saga, { lang });
  const svg = renderSvg(saga, { theme, lang });
  await Promise.all([
    fs.writeFile(path.join(outDir, 'saga.json'), json, 'utf8'),
    fs.writeFile(path.join(outDir, 'saga.md'), md, 'utf8'),
    fs.writeFile(path.join(outDir, 'saga.svg'), svg, 'utf8'),
  ]);
}

export function progressLogger(write: (line: string) => void = console.log): (event: ProgressEvent) => void {
  let last = '';
  return (event) => {
    const phase = kleur.cyan(event.phase.padEnd(10));
    const pct = event.progress !== undefined ? ` ${kleur.yellow(`${Math.round(event.progress * 100)}%`)}` : '';
    const line = `${phase}${event.message}${pct}`;
    if (line === last) return;
    last = line;
    write(line);
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    help();
    return;
  }
  if (args.version) {
    console.log(await readVersion());
    return;
  }
  const validationError = validateArgs(args);
  if (validationError) die(validationError);
  const jsonStdoutOnly = isJsonStdoutOnly(args);
  const info = jsonStdoutOnly ? console.error : console.log;

  if (!args.source) {
    // Just launch the web UI
    if (!args.server) {
      help();
      die('No repo specified and --no-server given. Nothing to do.');
    }
    const server = await startServer({ port: args.port });
    info(`${kleur.green('▲ repo-saga')} listening on ${kleur.bold(server.url)}`);
    if (args.open) await tryOpen(server.url);
    process.on('SIGINT', () => {
      console.log('\nShutting down…');
      void server.stop().then(() => process.exit(0));
    });
    return;
  }

  // analyse and emit
  info(`${kleur.green('▲ repo-saga')} analysing ${kleur.bold(args.source)}`);
  const saga = await generateSaga(args.source, {
    onProgress: progressLogger(info),
    maxCommits: args.maxCommits,
    cacheDir: args.cacheDir,
  });

  if (args.json && !args.server) {
    process.stdout.write(renderJson(saga) + '\n');
  }

  const outDir = path.resolve(args.out);
  await writeOutputs(saga, outDir, args.theme, args.lang);
  info('');
  info(`${kleur.green('✓')} Wrote ${kleur.bold(path.join(outDir, 'saga.json'))}`);
  info(`${kleur.green('✓')} Wrote ${kleur.bold(path.join(outDir, 'saga.md'))}`);
  info(`${kleur.green('✓')} Wrote ${kleur.bold(path.join(outDir, 'saga.svg'))} (theme: ${args.theme}, lang: ${args.lang})`);
  info('');
  info(
    `${kleur.gray('Eras:')} ${saga.eras.length}  ${kleur.gray('Events:')} ${saga.events.length}  ${kleur.gray('Commits:')} ${saga.repo.commitCount.toLocaleString()}`,
  );
  for (const era of saga.eras) {
    const name = translateEra(era, saga.events, args.lang).name;
    info(`  ${kleur.cyan(`${era.startYear}–${era.endYear}`)}  ${kleur.bold(name)}`);
  }

  if (!args.server) return;

  const server = await startServer({ port: args.port, initialSaga: saga });
  info('');
  info(`${kleur.green('▲ repo-saga')} preview at ${kleur.bold(server.url)}`);
  if (args.open) await tryOpen(server.url);
  process.on('SIGINT', () => {
    console.log('\nShutting down…');
    void server.stop().then(() => process.exit(0));
  });
}

async function tryOpen(url: string) {
  try {
    await open(url);
  } catch {
    // ignore browser launch failures (e.g. headless env)
  }
}

function isDirectRun(): boolean {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));
}

if (isDirectRun()) {
  main().catch((err) => {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(kleur.red(msg));
    process.exit(1);
  });
}

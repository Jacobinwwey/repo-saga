# repo-saga

[English](./README.md) · [中文](./README.zh.md)

> Render the **civilization history** of any git repository — eras, events, posters, and JSON, generated locally from heuristics.

<p align="center">
  <img src="https://raw.githubusercontent.com/teee32/repo-saga/main/examples/sample-saga.svg" width="820" alt="repo-saga sample poster" />
  <br/>
  <sub>Sample poster (<code>epic</code> theme). The same data renders in English and 中文 — see <a href="./examples/">examples/</a>.</sub>
</p>

`repo-saga` reads a repo's git history and turns it into a "chronicle": a small set of named **eras** ("Ancient Era: Initial Chaos", "Migration Era: TypeScript Invasion", "Modern Era: Linting Theocracy", …) and **events** with evidence pulled directly from the commits. Each meme is grounded in a fact: a tsconfig.json that appeared on a date, a linter that arrived, a 90-day window where 800 files moved.

It runs **entirely on your machine**. No OpenAI / Anthropic / Gemini calls, no auth, no SaaS, no database.

```text
$ npx repo-saga https://github.com/sindresorhus/execa
▲ repo-saga analysing https://github.com/sindresorhus/execa
init       Resolving source: …
git-log    Reading git history…
parsing    Parsed 1,302 commits                40%
detecting  Running heuristic detectors…        70%
eras       Carving the timeline into eras…     85%
done       Saga complete.                      100%

✓ Wrote ./saga.json
✓ Wrote ./saga.md
✓ Wrote ./saga.svg (theme: epic)

Eras: 4   Events: 9   Commits: 1,302
  2014–2017  Ancient Era: Initial Chaos
  2018–2020  Migration Era: TypeScript Invasion
  2021–2022  Federation Era: Monorepo Federation
  2023–2025  Modern Era: Linting Theocracy
▲ repo-saga preview at http://127.0.0.1:54323
```

## Install

`repo-saga` is published as a single CLI bin. The fastest way to use it is `npx`:

```bash
npx repo-saga                              # opens the local web UI
npx repo-saga https://github.com/owner/repo
npx repo-saga ./my-project --theme academic --out ./out
```

To install globally:

```bash
npm i -g repo-saga
# or
pnpm add -g repo-saga
```

Requires Node.js 18.17+ and `git` available on `$PATH`.

## CLI

| Form                                                       | Behaviour                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `repo-saga`                                                | Start the local server, open the web UI in your browser. You enter repos there.                   |
| `repo-saga <repo>`                                         | Analyse a repo. Write `saga.json`, `saga.md`, `saga.svg` to the current dir. Open preview in browser. |
| `repo-saga <repo> --no-open`                               | Same as above, don't auto-open.                                                                   |
| `repo-saga <repo> --no-server`                             | Just emit the files; don't start the web server.                                                  |
| `repo-saga <repo> --out ./output`                          | Write outputs into `./output`.                                                                    |
| `repo-saga <repo> --theme dark-fantasy`                    | Choose an SVG theme (`epic`, `dark-fantasy`, `academic`, `minimal`).                              |
| `repo-saga <repo> --max-commits 10000`                     | Cap how many commits to read on huge repos.                                                       |
| `repo-saga <repo> --port 5555`                             | Pin the web server port.                                                                          |
| `repo-saga --help`                                         | Show all flags.                                                                                   |

`<repo>` may be:

- An HTTPS GitHub / GitLab / Bitbucket URL (`https://github.com/user/repo`)
- A `git@…:user/repo.git` SSH URL
- A local path to a directory containing a `.git` folder

When you give a remote URL, `repo-saga` clones it into `$TMPDIR/repo-saga-cache` (configurable via `--cache-dir`).

## Outputs

A run produces three artefacts (and a live web view of the same data):

### `saga.json`

A structured snapshot of everything the analysis discovered:

```jsonc
{
  "schemaVersion": 1,
  "repo": {
    "name": "execa",
    "source": "https://github.com/sindresorhus/execa",
    "commitCount": 1302,
    "contributors": 84,
    "tagCount": 96,
    "firstCommitDate": "2014-...",
    "lastCommitDate": "2025-..."
  },
  "eras":  [ /* 3..7 named eras with evidence */ ],
  "events": [ /* 14 detector outputs with evidence */ ],
  "stats":  { /* commits/year, languages/year, … */ },
  "meta":   { "generator": "repo-saga", "generatorVersion": "0.1.0", "durationMs": 1234 }
}
```

### `saga.md`

A printable / pasteable Markdown chronicle:

```md
# The Civilization of execa

## Ancient Era: Initial Chaos, 2014–2015

> _foundations and improvisation_

Evidence:
- 168 commits in the first 4 months
- package.json appeared on 2014-04-19
- src/ and test/ appeared within 11 days
…
```

### `saga.svg`

A standalone, themable SVG poster. No fonts or images embedded — pure XML. Looks like a tabletop "history of a project" map.

## Web UI

Running `repo-saga` (no args) launches a local Fastify server (random port) and opens the UI. Features:

- Paste a repo URL or local path → click **Generate**
- Live progress events stream over Server-Sent Events
- See eras as cards; click one to view its events with full evidence
- Switch themes (`epic` / `dark-fantasy` / `academic` / `minimal`)
- Download the SVG, copy the Markdown, view the JSON

In dev (`pnpm --filter @repo-saga/web run dev`) the web UI proxies `/api/*` to a local backend on `127.0.0.1:7878`.

## How it works

There is no machine-learning model and no LLM. The pipeline is:

```text
                ┌─────────────┐
  url|path  ──▶ │  resolve    │  (clone if needed, into $TMPDIR/repo-saga-cache)
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  git log    │  --numstat with a sentinel format
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  analyse    │  yearly stats, signal-files index, contributor stats
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  detectors  │  14 heuristic detectors → DetectedEvent[]
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │   eras      │  cluster events into 3..7 named eras
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  renderers  │  saga.json / saga.md / saga.svg
                └─────────────┘
```

Each event carries a `confidence` (0..1) and `severity` (`minor`, `notable`, `major`, `epoch-defining`). Evidence is always a list of concrete facts (paths, dates, counts) — no opinions without receipts.

## Heuristic detectors

| Detector                | Evidence basis                                                          |
| ----------------------- | ----------------------------------------------------------------------- |
| `initial-chaos`         | First 60 days: commits, founders, founding files                        |
| `typescript-invasion`   | tsconfig appearance + ts/tsx insertions crossing JS                     |
| `great-refactor-war`    | 90-day window with the most files touched, renamed, deleted             |
| `testing-famine`        | Multi-year stretch where tests are <5% of insertions                    |
| `testing-renaissance`   | Test-config arrival OR test-files-per-year jump                         |
| `linting-theocracy`     | eslint / prettier / biome / ruff / husky / lint-staged appearance       |
| `container-empire`      | Dockerfile / compose / k8s / helm / terraform appearance                |
| `monorepo-federation`   | pnpm-workspace / turbo / nx / lerna / packages/ / apps/ appearance      |
| `dependency-cataclysm`  | Single commits churning >1k lockfile lines                              |
| `founder-exodus`        | Top early contributors who stop appearing in the final quartile         |
| `new-dynasty`           | Contributors who only show up in the final quartile and dominate it     |
| `ai-priesthood`         | openai / anthropic / langchain / claude / cursor / copilot / … appearances |
| `bug-plague`            | A month where ≥40% of commits are fix/bug/hotfix/revert                 |
| `release-empire`        | ≥5 dated tags, especially semver-shaped ones                            |

All detectors are stateless and run in parallel. Add your own by exporting a `Detector` from `@repo-saga/core`.

## Project layout

```
repo-saga/
  package.json            ← workspace root, scripts: build/test/lint/format
  pnpm-workspace.yaml
  tsconfig.base.json
  vitest.config.ts
  eslint.config.js
  packages/
    core/                 ← git mining, analyzer, 14 detectors, era grouping
    renderer/             ← JSON / Markdown / SVG
    server/               ← Fastify + SSE jobs API
    web/                  ← Vite + React UI
    cli/                  ← `repo-saga` bin entry
  examples/               ← sample saga.json / saga.md / saga.svg
```

## Development

```bash
pnpm install
pnpm build      # build all packages
pnpm test       # vitest across packages
pnpm lint       # eslint across packages
pnpm format     # prettier write
```

Run the CLI from the workspace:

```bash
node packages/cli/dist/index.js https://github.com/sindresorhus/execa --out ./tmp
```

Run the dev UI (with backend hot-loop):

```bash
# terminal A (backend; proxy target)
node -e 'import("@repo-saga/server").then(m => m.startServer({ port: 7878 }))'
# terminal B
pnpm --filter @repo-saga/web run dev
```

## Roadmap

- Optional plug-in detectors (file paths or npm packages)
- More themes (newspaper, blueprint, comic)
- Multi-repo "civilizations meet" comparisons
- HTML poster export for printing
- "Why did this event fire?" debug panel in the UI
- Support hg / fossil via the same heuristic core
- Optional AI re-write of narrative copy (opt-in flag, BYO key)

## Contributing

Issues and PRs are welcome. The core idea: every chronicle line should have evidence behind it. If a detector adds flavour text without a fact, that's a bug.

1. `pnpm install`
2. `pnpm build && pnpm test && pnpm lint`
3. Add tests for your detector or renderer change
4. Open a PR

## License

[MIT](./LICENSE) © repo-saga contributors

## Community

Discussion, feedback, and ideas: [LinuxDo](https://linux.do)

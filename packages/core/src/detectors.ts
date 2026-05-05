import { classifyPath, extensionOf, yearOf } from './analyzer.js';
import type {
  AnalyzedRepo,
  DetectedEvent,
  EventSeverity,
  EventType,
  RawCommit,
  SignalFile,
  SignalFileKind,
} from './types.js';

const SEVERITY_WEIGHT: Record<EventSeverity, number> = {
  minor: 1,
  notable: 2,
  major: 3,
  'epoch-defining': 4,
};

export interface Detector {
  type: EventType;
  run(analyzed: AnalyzedRepo): DetectedEvent[];
}

export function makeEvent(input: {
  type: EventType;
  title: string;
  startDate: string;
  endDate: string;
  severity: EventSeverity;
  confidence: number;
  narrative: string;
  evidence: string[];
  debug?: DetectedEvent['debug'];
  idSuffix?: string;
}): DetectedEvent {
  const startYear = yearOf(input.startDate);
  const endYear = yearOf(input.endDate);
  const id = `${input.type}${input.idSuffix ? `-${input.idSuffix}` : `-${startYear}`}`;
  const score = clamp01(input.confidence) * SEVERITY_WEIGHT[input.severity];
  return {
    id,
    type: input.type,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    startYear,
    endYear,
    severity: input.severity,
    confidence: clamp01(input.confidence),
    narrative: input.narrative,
    evidence: input.evidence,
    debug: input.debug,
    score,
  };
}

export function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

const initialChaosDetector: Detector = {
  type: 'initial-chaos',
  run(repo) {
    if (repo.commits.length === 0) return [];
    const first = repo.commits[0];
    const start = new Date(first.date).getTime();
    const window = 60 * 24 * 60 * 60 * 1000; // 60 days
    const windowEnd = start + window;
    const within = repo.commits.filter((c) => new Date(c.date).getTime() <= windowEnd);
    if (within.length < 5) return [];
    const totalInsertions = within.reduce((sum, c) => sum + c.insertions, 0);
    const filesTouched = new Set<string>();
    for (const c of within) for (const f of c.files) filesTouched.add(f.path);
    const days =
      Math.max(1, (new Date(within[within.length - 1].date).getTime() - start) / 86_400_000) | 0;

    const evidence: string[] = [
      `${within.length} commits in the first ${Math.max(1, days)} day(s)`,
      `${totalInsertions.toLocaleString()} insertions during the founding period`,
      `${filesTouched.size} distinct files touched in the early period`,
    ];

    const founders = countFounders(within);
    if (founders.length > 0) {
      evidence.push(`Earliest contributors: ${founders.slice(0, 3).join(', ')}`);
    }

    const earliestSignals = repo.signalFiles
      .filter((s) => new Date(s.firstSeen).getTime() <= windowEnd)
      .slice(0, 4);
    for (const s of earliestSignals) {
      evidence.push(`${prettyKind(s.kind)} appeared at ${s.path} on ${shortDate(s.firstSeen)}`);
    }

    const severity: EventSeverity =
      within.length >= 200 ? 'epoch-defining' : within.length >= 50 ? 'major' : 'notable';
    const confidence = clamp01(0.5 + Math.min(0.4, within.length / 500));

    return [
      makeEvent({
        type: 'initial-chaos',
        title: 'Initial Chaos',
        startDate: first.date,
        endDate: within[within.length - 1].date,
        severity,
        confidence,
        narrative:
          'The first tribes gather around a fragile structure of files and hope. Foundational artefacts appear in rapid succession.',
        evidence,
        debug: {
          detector: 'initial-chaos',
          positive: `Founding window crossed the ${formatNumber(5)} commit threshold.`,
          metrics: [
            { label: 'founding-window commits', value: within.length, threshold: '>= 5' },
            { label: 'founding-window days', value: Math.max(1, days), threshold: '<= 60' },
            { label: 'early files touched', value: filesTouched.size },
          ],
        },
      }),
    ];
  },
};

const typescriptInvasionDetector: Detector = {
  type: 'typescript-invasion',
  run(repo) {
    const tsConfig = repo.signalFiles.find((s) => s.kind === 'tsconfig');
    const yearTs = new Map<number, number>();
    const yearJs = new Map<number, number>();
    for (const c of repo.commits) {
      const y = yearOf(c.date);
      for (const f of c.files) {
        const ext = extensionOf(f.path);
        if (!ext) continue;
        if (ext === 'ts' || ext === 'tsx') yearTs.set(y, (yearTs.get(y) ?? 0) + f.insertions);
        else if (['js', 'jsx', 'mjs', 'cjs'].includes(ext))
          yearJs.set(y, (yearJs.get(y) ?? 0) + f.insertions);
      }
    }
    const years = [...new Set([...yearTs.keys(), ...yearJs.keys()])].sort((a, b) => a - b);
    if (years.length === 0 && !tsConfig) return [];

    let invasionStart: number | undefined;
    let invasionEnd: number | undefined;
    let crossedYear: number | undefined;
    for (const y of years) {
      const ts = yearTs.get(y) ?? 0;
      const js = yearJs.get(y) ?? 0;
      const total = ts + js;
      const ratio = total > 0 ? ts / total : 0;
      if (ratio > 0.05 && invasionStart === undefined) invasionStart = y;
      if (ratio >= 0.5 && crossedYear === undefined) crossedYear = y;
      if (invasionStart !== undefined) invasionEnd = y;
    }

    if (!tsConfig && invasionStart === undefined) return [];

    const startYear = tsConfig ? Math.min(yearOf(tsConfig.firstSeen), invasionStart ?? 9999) : (invasionStart as number);
    const endYear = invasionEnd ?? crossedYear ?? startYear;

    const evidence: string[] = [];
    if (tsConfig) {
      evidence.push(
        `tsconfig.json first appeared on ${shortDate(tsConfig.firstSeen)} (${tsConfig.path})`,
      );
    }
    if (crossedYear !== undefined) {
      evidence.push(`TypeScript crossed 50% of code insertions in ${crossedYear}`);
    }
    if (invasionStart !== undefined && invasionEnd !== undefined) {
      const tsTotal = (yearTs.get(invasionEnd) ?? 0).toLocaleString();
      const jsTotal = (yearJs.get(invasionEnd) ?? 0).toLocaleString();
      evidence.push(
        `By ${invasionEnd}, +${tsTotal} TS insertions vs +${jsTotal} JS insertions`,
      );
    }
    const severity: EventSeverity =
      crossedYear !== undefined ? 'major' : tsConfig ? 'notable' : 'minor';
    const confidence = clamp01(0.4 + (crossedYear !== undefined ? 0.4 : 0) + (tsConfig ? 0.2 : 0));

    const startDate = tsConfig?.firstSeen ?? `${startYear}-01-01T00:00:00Z`;
    const endDate = `${endYear}-12-31T23:59:59Z`;

    return [
      makeEvent({
        type: 'typescript-invasion',
        title: 'TypeScript Invasion',
        startDate,
        endDate,
        severity,
        confidence,
        narrative:
          'A migration of types swept across the land. Untyped artefacts gave way to interfaces, generics, and the rule of strict.',
        evidence,
        debug: {
          detector: 'typescript-invasion',
          positive:
            crossedYear !== undefined
              ? `TypeScript share crossed 50% in ${crossedYear}.`
              : tsConfig
                ? `TypeScript configuration appeared at ${tsConfig.path}.`
                : `TypeScript insertions crossed the 5% discovery threshold in ${startYear}.`,
          negative:
            crossedYear === undefined
              ? `No year reached the 50% TypeScript-majority threshold.`
              : undefined,
          metrics: [
            { label: 'first TS-signal year', value: startYear, threshold: 'tsconfig or TS share > 5%' },
            { label: 'majority year', value: crossedYear ?? 'not crossed', threshold: '>= 50%' },
            { label: 'latest TS insertions', value: invasionEnd !== undefined ? (yearTs.get(invasionEnd) ?? 0) : 0 },
            { label: 'latest JS insertions', value: invasionEnd !== undefined ? (yearJs.get(invasionEnd) ?? 0) : 0 },
          ],
        },
        idSuffix: String(startYear),
      }),
    ];
  },
};

const greatRefactorDetector: Detector = {
  type: 'great-refactor-war',
  run(repo) {
    if (repo.commits.length < 30) return [];
    // Look at 90-day rolling windows; keep the best.
    const windowMs = 90 * 86_400_000;
    let best: { startIdx: number; endIdx: number; renames: number; deletions: number; files: number } | undefined;
    for (let i = 0; i < repo.commits.length; i++) {
      const start = new Date(repo.commits[i].date).getTime();
      let renames = 0;
      let deletions = 0;
      const filesSet = new Set<string>();
      let j = i;
      for (; j < repo.commits.length; j++) {
        const ts = new Date(repo.commits[j].date).getTime();
        if (ts > start + windowMs) break;
        const c = repo.commits[j];
        for (const f of c.files) {
          filesSet.add(f.path);
          if (f.status === 'renamed') renames += 1;
          if (f.deletions > 0 && f.insertions === 0) deletions += 1;
        }
      }
      const score = filesSet.size + renames * 2 + deletions;
      if (!best || score > best.files + best.renames * 2 + best.deletions) {
        best = { startIdx: i, endIdx: j - 1, renames, deletions, files: filesSet.size };
      }
    }
    if (!best || best.files < 200) return [];

    const startDate = repo.commits[best.startIdx].date;
    const endDate = repo.commits[best.endIdx].date;
    const evidence = [
      `${best.files} distinct files changed in a 90-day window`,
      `${best.renames} files renamed during the upheaval`,
      `${best.deletions} files purged from the kingdom`,
    ];

    const newDirs = findNewTopLevelDirs(repo, startDate, endDate);
    if (newDirs.length > 0) {
      evidence.push(`New top-level structures appeared: ${newDirs.slice(0, 5).join(', ')}`);
    }

    const severity: EventSeverity =
      best.files >= 1000 ? 'epoch-defining' : best.files >= 500 ? 'major' : 'notable';
    const confidence = clamp01(0.3 + Math.min(0.6, best.files / 1500));

    return [
      makeEvent({
        type: 'great-refactor-war',
        title: 'Great Refactor War',
        startDate,
        endDate,
        severity,
        confidence,
        narrative:
          'A sweeping campaign of restructuring redrew the map. Old fortresses fell, new districts rose, and naming conventions were re-litigated in blood.',
        evidence,
        debug: {
          detector: 'great-refactor-war',
          positive: `A 90-day window changed ${formatNumber(best.files)} files, above the ${formatNumber(200)} file threshold.`,
          metrics: [
            { label: 'files in 90-day window', value: best.files, threshold: '>= 200' },
            { label: 'renamed files', value: best.renames },
            { label: 'purged files', value: best.deletions },
          ],
        },
      }),
    ];
  },
};

const testingFamineDetector: Detector = {
  type: 'testing-famine',
  run(repo) {
    if (repo.yearly.length < 2) return [];
    const dataYears = repo.yearly.filter((y) => y.codeInsertions + y.testInsertions > 0);
    if (dataYears.length < 2) return [];
    let famineStart: number | undefined;
    let famineEnd: number | undefined;
    let worstRatio = 1;
    let worstYear = 0;
    for (const y of dataYears) {
      const total = y.codeInsertions + y.testInsertions;
      const ratio = total > 0 ? y.testInsertions / total : 0;
      if (total > 1000 && ratio < 0.05) {
        if (famineStart === undefined) famineStart = y.year;
        famineEnd = y.year;
        if (ratio < worstRatio) {
          worstRatio = ratio;
          worstYear = y.year;
        }
      } else if (famineStart !== undefined && ratio > 0.1) {
        // famine ended
        break;
      }
    }
    if (famineStart === undefined || famineEnd === undefined) return [];
    if (famineEnd - famineStart < 1) return [];
    const evidence = [
      `Test insertions stayed below 5% of code insertions from ${famineStart} to ${famineEnd}`,
      `Worst year ${worstYear}: only ${(worstRatio * 100).toFixed(1)}% of insertions came from tests`,
    ];
    return [
      makeEvent({
        type: 'testing-famine',
        title: 'Testing Famine',
        startDate: `${famineStart}-01-01T00:00:00Z`,
        endDate: `${famineEnd}-12-31T23:59:59Z`,
        severity: 'notable',
        confidence: 0.55,
        narrative:
          'The granaries of regression coverage stood empty. Business logic multiplied while assertions slept.',
        evidence,
        debug: {
          detector: 'testing-famine',
          positive: `Test insertion ratio stayed below 5% for ${famineEnd - famineStart + 1} year(s).`,
          metrics: [
            { label: 'famine span', value: `${famineStart}–${famineEnd}`, threshold: '>= 2 years' },
            { label: 'worst test ratio', value: `${(worstRatio * 100).toFixed(1)}%`, threshold: '< 5%' },
            { label: 'worst year', value: worstYear },
          ],
        },
        idSuffix: String(famineStart),
      }),
    ];
  },
};

const testingRenaissanceDetector: Detector = {
  type: 'testing-renaissance',
  run(repo) {
    const testTools = repo.signalFiles.filter((s) =>
      ['jest', 'vitest', 'playwright', 'cypress', 'mocha'].includes(s.kind),
    );
    let bestSurge: { year: number; from: number; to: number } | undefined;
    for (let i = 1; i < repo.yearly.length; i++) {
      const prev = repo.yearly[i - 1];
      const cur = repo.yearly[i];
      if (cur.testFiles - prev.testFiles >= 30 || cur.testFiles >= 2 * Math.max(1, prev.testFiles)) {
        if (!bestSurge || cur.testFiles - prev.testFiles > bestSurge.to - bestSurge.from) {
          bestSurge = { year: cur.year, from: prev.testFiles, to: cur.testFiles };
        }
      }
    }
    if (!bestSurge && testTools.length === 0) return [];

    const evidence: string[] = [];
    if (bestSurge) {
      evidence.push(
        `Test files touched per year jumped from ${bestSurge.from} (${bestSurge.year - 1}) to ${bestSurge.to} (${bestSurge.year})`,
      );
    }
    for (const t of testTools.slice(0, 4)) {
      evidence.push(`${prettyKind(t.kind)} introduced at ${t.path} on ${shortDate(t.firstSeen)}`);
    }
    const startDate = bestSurge
      ? `${bestSurge.year}-01-01T00:00:00Z`
      : testTools[0]?.firstSeen ?? new Date().toISOString();
    const endDate = bestSurge
      ? `${bestSurge.year}-12-31T23:59:59Z`
      : testTools[testTools.length - 1]?.lastSeen ?? startDate;

    const severity: EventSeverity =
      bestSurge && bestSurge.to >= 200 ? 'major' : testTools.length >= 2 ? 'notable' : 'minor';

    return [
      makeEvent({
        type: 'testing-renaissance',
        title: 'Testing Renaissance',
        startDate,
        endDate,
        severity,
        confidence: 0.6,
        narrative:
          'Scribes returned to the assertion halls. Spec files multiplied; CI pipelines lit up with green.',
        evidence,
        debug: {
          detector: 'testing-renaissance',
          positive: bestSurge
            ? `Touched test files jumped from ${bestSurge.from} to ${bestSurge.to}.`
            : `${testTools.length} test-tool signal file(s) appeared.`,
          negative: bestSurge ? undefined : 'No year-over-year test-file surge was large enough; tool appearance triggered the event.',
          metrics: [
            { label: 'test tool signals', value: testTools.length, threshold: '>= 1' },
            { label: 'surge from', value: bestSurge?.from ?? 'n/a' },
            { label: 'surge to', value: bestSurge?.to ?? 'n/a', threshold: '>= 2x previous or +30' },
          ],
        },
        idSuffix: String(yearOf(startDate)),
      }),
    ];
  },
};

const lintingTheocracyDetector: Detector = {
  type: 'linting-theocracy',
  run(repo) {
    const lintTools = repo.signalFiles.filter((s) =>
      ['eslint', 'prettier', 'biome', 'ruff', 'husky', 'lint-staged'].includes(s.kind),
    );
    if (lintTools.length === 0) return [];
    const startDate = lintTools[0].firstSeen;
    const endDate = lintTools[lintTools.length - 1].lastSeen;
    const evidence: string[] = lintTools
      .slice(0, 6)
      .map((t) => `${prettyKind(t.kind)} arrived at ${t.path} on ${shortDate(t.firstSeen)}`);
    const severity: EventSeverity = lintTools.length >= 3 ? 'major' : 'notable';
    return [
      makeEvent({
        type: 'linting-theocracy',
        title: 'Linting Theocracy',
        startDate,
        endDate,
        severity,
        confidence: clamp01(0.5 + lintTools.length * 0.1),
        narrative:
          'A clergy of formatters and linters declared semicolons, quote styles, and trailing commas as articles of faith.',
        evidence,
        debug: {
          detector: 'linting-theocracy',
          positive: `${lintTools.length} formatting/linting signal file(s) appeared.`,
          metrics: [
            { label: 'lint signals', value: lintTools.length, threshold: '>= 1' },
            { label: 'severity upgrade', value: lintTools.length >= 3 ? 'major' : 'notable', threshold: 'major at >= 3 signals' },
          ],
        },
        idSuffix: String(yearOf(startDate)),
      }),
    ];
  },
};

const containerEmpireDetector: Detector = {
  type: 'container-empire',
  run(repo) {
    const items = repo.signalFiles.filter((s) =>
      ['dockerfile', 'docker-compose', 'k8s', 'helm', 'terraform'].includes(s.kind),
    );
    if (items.length === 0) return [];
    const startDate = items[0].firstSeen;
    const endDate = items[items.length - 1].lastSeen;
    const evidence: string[] = items
      .slice(0, 6)
      .map((t) => `${prettyKind(t.kind)} appeared at ${t.path} on ${shortDate(t.firstSeen)}`);
    const severity: EventSeverity = items.length >= 3 ? 'major' : 'notable';
    return [
      makeEvent({
        type: 'container-empire',
        title: 'Container Empire',
        startDate,
        endDate,
        severity,
        confidence: clamp01(0.5 + items.length * 0.1),
        narrative:
          'The realm fortified itself in containers. Manifests, charts, and infrastructure incantations spread to every province.',
        evidence,
        debug: {
          detector: 'container-empire',
          positive: `${items.length} container/infrastructure signal file(s) appeared.`,
          metrics: [
            { label: 'container/IaC signals', value: items.length, threshold: '>= 1' },
            { label: 'severity upgrade', value: items.length >= 3 ? 'major' : 'notable', threshold: 'major at >= 3 signals' },
          ],
        },
        idSuffix: String(yearOf(startDate)),
      }),
    ];
  },
};

const monorepoFederationDetector: Detector = {
  type: 'monorepo-federation',
  run(repo) {
    const items = repo.signalFiles.filter((s) =>
      ['pnpm-workspace', 'turbo', 'nx', 'lerna'].includes(s.kind),
    );
    const hasPackagesDir = Object.keys(repo.firstSeen).some((p) => /^packages\//.test(p));
    const hasAppsDir = Object.keys(repo.firstSeen).some((p) => /^apps\//.test(p));
    if (items.length === 0 && !hasPackagesDir && !hasAppsDir) return [];
    const evidence: string[] = items.map(
      (t) => `${prettyKind(t.kind)} arrived at ${t.path} on ${shortDate(t.firstSeen)}`,
    );
    if (hasPackagesDir) evidence.push('packages/ directory came into existence');
    if (hasAppsDir) evidence.push('apps/ directory came into existence');
    const earliest = items[0]?.firstSeen ?? earliestPathDate(repo, ['packages/', 'apps/']);
    const latest = items[items.length - 1]?.lastSeen ?? earliest;
    const severity: EventSeverity =
      items.length >= 2 || (hasPackagesDir && hasAppsDir) ? 'major' : 'notable';
    return [
      makeEvent({
        type: 'monorepo-federation',
        title: 'Monorepo Federation',
        startDate: earliest ?? new Date().toISOString(),
        endDate: latest ?? new Date().toISOString(),
        severity,
        confidence: 0.65,
        narrative:
          'City-states united under a single repo banner. Workspace manifests defined the borders; build orchestrators kept the peace.',
        evidence,
        debug: {
          detector: 'monorepo-federation',
          positive: `${items.length} workspace orchestrator signal(s)${hasPackagesDir ? ' plus packages/' : ''}${hasAppsDir ? ' plus apps/' : ''} were found.`,
          metrics: [
            { label: 'workspace signals', value: items.length },
            { label: 'packages/ present', value: hasPackagesDir ? 'yes' : 'no' },
            { label: 'apps/ present', value: hasAppsDir ? 'yes' : 'no' },
          ],
        },
        idSuffix: String(yearOf(earliest ?? new Date().toISOString())),
      }),
    ];
  },
};

const dependencyCataclysmDetector: Detector = {
  type: 'dependency-cataclysm',
  run(repo) {
    const lockfileChanges = repo.commits.filter((c) =>
      c.files.some((f) => classifyPath(f.path) === 'lockfile' && f.insertions + f.deletions > 1000),
    );
    if (lockfileChanges.length === 0) return [];
    // Pick the biggest single commit
    let biggest: RawCommit | undefined;
    let biggestMagnitude = 0;
    for (const c of lockfileChanges) {
      const lockMagnitude = c.files
        .filter((f) => classifyPath(f.path) === 'lockfile')
        .reduce((sum, f) => sum + f.insertions + f.deletions, 0);
      if (lockMagnitude > biggestMagnitude) {
        biggest = c;
        biggestMagnitude = lockMagnitude;
      }
    }
    if (!biggest) return [];
    const evidence: string[] = [
      `${biggest.shortHash} on ${shortDate(biggest.date)} touched ${biggestMagnitude.toLocaleString()} lockfile lines`,
      `${lockfileChanges.length} commit(s) involved heavy dependency churn`,
    ];
    const subjects = lockfileChanges
      .map((c) => c.subject)
      .filter((s) => /upgrade|bump|security|deps|dependenc/i.test(s))
      .slice(0, 3);
    for (const s of subjects) evidence.push(`Notable subject: "${s}"`);
    const severity: EventSeverity = biggestMagnitude >= 10_000 ? 'major' : 'notable';
    return [
      makeEvent({
        type: 'dependency-cataclysm',
        title: 'Dependency Cataclysm',
        startDate: biggest.date,
        endDate: biggest.date,
        severity,
        confidence: clamp01(0.4 + Math.min(0.4, biggestMagnitude / 50_000)),
        narrative:
          'A great quaking of lockfiles shook the foundations. Versions collided, graphs were rewritten, and humans clutched their CI logs.',
        evidence,
        debug: {
          detector: 'dependency-cataclysm',
          positive: `Largest lockfile churn touched ${formatNumber(biggestMagnitude)} lines.`,
          metrics: [
            { label: 'largest lockfile churn', value: biggestMagnitude, threshold: '> 1,000 lines' },
            { label: 'heavy dependency commits', value: lockfileChanges.length },
          ],
        },
      }),
    ];
  },
};

const founderExodusDetector: Detector = {
  type: 'founder-exodus',
  run(repo) {
    if (repo.commits.length < 200 || repo.contributors.length < 3) return [];
    const earliestQuarterCutoff = quantileDate(repo.commits, 0.25);
    const lastQuarterCutoff = quantileDate(repo.commits, 0.75);
    if (!earliestQuarterCutoff || !lastQuarterCutoff) return [];
    const earlyContribCounts = new Map<string, number>();
    for (const c of repo.commits) {
      if (new Date(c.date).getTime() <= earliestQuarterCutoff) {
        const k = c.authorEmail.toLowerCase();
        earlyContribCounts.set(k, (earlyContribCounts.get(k) ?? 0) + 1);
      }
    }
    const founders = [...earlyContribCounts.entries()]
      .filter(([, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (founders.length === 0) return [];
    const exited = founders.filter(([email]) => {
      const stats = repo.contributors.find((cstat) => cstat.email.toLowerCase() === email);
      if (!stats) return false;
      return new Date(stats.lastSeen).getTime() < lastQuarterCutoff;
    });
    if (exited.length === 0) return [];

    const evidence: string[] = exited.map(([email, count]) => {
      const stats = repo.contributors.find((cstat) => cstat.email.toLowerCase() === email);
      const name = stats?.name ?? email;
      const last = stats ? shortDate(stats.lastSeen) : '?';
      return `${name} (${count} early commits) was last seen on ${last}`;
    });
    const startDate = exited
      .map(([email]) => repo.contributors.find((c) => c.email.toLowerCase() === email)?.lastSeen ?? '')
      .filter(Boolean)
      .sort()[0];
    return [
      makeEvent({
        type: 'founder-exodus',
        title: 'Founder Exodus',
        startDate: startDate || new Date(earliestQuarterCutoff).toISOString(),
        endDate: new Date(lastQuarterCutoff).toISOString(),
        severity: exited.length >= 2 ? 'major' : 'notable',
        confidence: clamp01(0.45 + exited.length * 0.1),
        narrative:
          'Some of those who first lit the campfires walked away. Their commits faded from the chronicle, leaving habits behind.',
        evidence,
        debug: {
          detector: 'founder-exodus',
          positive: `${exited.length} early contributor(s) stopped before the final quartile.`,
          metrics: [
            { label: 'founder candidates', value: founders.length, threshold: '>= 5 early commits' },
            { label: 'exited founders', value: exited.length, threshold: '>= 1' },
            { label: 'last-quartile cutoff', value: shortDate(new Date(lastQuarterCutoff).toISOString()) },
          ],
        },
        idSuffix: exited.map(([e]) => slug(e)).join('-').slice(0, 30),
      }),
    ];
  },
};

const newDynastyDetector: Detector = {
  type: 'new-dynasty',
  run(repo) {
    if (repo.commits.length < 200 || repo.contributors.length < 3) return [];
    const lastQuarterCutoff = quantileDate(repo.commits, 0.75);
    if (!lastQuarterCutoff) return [];
    // Top contributors in last quarter
    const lateCounts = new Map<string, { count: number; first: string; name: string }>();
    for (const c of repo.commits) {
      if (new Date(c.date).getTime() >= lastQuarterCutoff) {
        const k = c.authorEmail.toLowerCase();
        const cur = lateCounts.get(k);
        if (!cur) {
          lateCounts.set(k, { count: 1, first: c.date, name: c.authorName });
        } else {
          cur.count += 1;
        }
      }
    }
    const ascending = [...lateCounts.entries()]
      .filter(([email]) => {
        const overall = repo.contributors.find((cstat) => cstat.email.toLowerCase() === email);
        if (!overall) return false;
        return new Date(overall.firstSeen).getTime() >= lastQuarterCutoff;
      })
      .sort((a, b) => b[1].count - a[1].count);
    if (ascending.length === 0) return [];
    const top = ascending.slice(0, 3);
    const evidence = top.map(
      ([email, info]) => `${info.name || email} appeared late and made ${info.count} commits`,
    );
    return [
      makeEvent({
        type: 'new-dynasty',
        title: 'New Dynasty',
        startDate: new Date(lastQuarterCutoff).toISOString(),
        endDate: repo.commits[repo.commits.length - 1].date,
        severity: top.length >= 2 ? 'notable' : 'minor',
        confidence: 0.55,
        narrative:
          'Fresh banners appeared on the ramparts. New contributors took up the maintenance plough and turned the codebase into their inheritance.',
        evidence,
        debug: {
          detector: 'new-dynasty',
          positive: `${top.length} late-arriving contributor(s) crossed the dynasty threshold.`,
          metrics: [
            { label: 'late contributors surfaced', value: top.length, threshold: '>= 1' },
            { label: 'newcomer threshold', value: Math.max(5, Math.floor(repo.commits.length * 0.02)), threshold: 'max(5, 2% of commits)' },
          ],
        },
        idSuffix: slug(top.map(([e]) => e).join('-')).slice(0, 24),
      }),
    ];
  },
};

const AI_KEYWORDS = [
  'openai',
  'anthropic',
  'langchain',
  'llamaindex',
  'llama_index',
  'huggingface',
  'hugging face',
  'transformers',
  'cohere',
  'mistral',
  'gemini',
  'copilot',
  'cursor',
  'claude',
  'gpt-3',
  'gpt-4',
  'gpt-5',
  'gpt4',
  'rag',
  'retrieval-augmented',
  'embedding',
  'embeddings',
  'vector store',
  'pgvector',
  'tiktoken',
  'prompt engineering',
];

// Build word-boundary regex: keyword must not be preceded or followed by a letter.
// Allows hyphens, digits, underscores, spaces around the keyword.
function buildKeywordRegex(keywords: string[]): RegExp {
  const escaped = keywords
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  return new RegExp(`(?<![a-z])(?:${escaped.join('|')})(?![a-z])`, 'i');
}

const AI_REGEX = buildKeywordRegex(AI_KEYWORDS);

const aiPriesthoodDetector: Detector = {
  type: 'ai-priesthood',
  run(repo) {
    const matches: { hit: string; where: string; date: string }[] = [];
    for (const c of repo.commits) {
      const haystack = `${c.subject} ${c.body ?? ''}`;
      const m = haystack.match(AI_REGEX);
      if (m) {
        matches.push({
          hit: m[0].toLowerCase(),
          where: `commit ${c.shortHash} "${c.subject}"`,
          date: c.date,
        });
      }
      for (const f of c.files) {
        const fm = f.path.match(AI_REGEX);
        if (fm) {
          matches.push({
            hit: fm[0].toLowerCase(),
            where: `path ${f.path}`,
            date: c.date,
          });
          break;
        }
      }
    }
    if (matches.length === 0) return [];
    matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const evidence = matches.slice(0, 6).map(
      (m) => `${shortDate(m.date)}: "${m.hit}" appeared in ${m.where}`,
    );
    if (matches.length > 6) evidence.push(`…and ${matches.length - 6} more AI-keyword hits`);
    const severity: EventSeverity = matches.length >= 30 ? 'major' : 'notable';
    return [
      makeEvent({
        type: 'ai-priesthood',
        title: 'AI Priesthood',
        startDate: matches[0].date,
        endDate: matches[matches.length - 1].date,
        severity,
        confidence: clamp01(0.4 + Math.min(0.4, matches.length / 50)),
        narrative:
          'A new clergy arrived bearing model weights and prompt scrolls. Vector stores rose where SQL had once ruled.',
        evidence,
        debug: {
          detector: 'ai-priesthood',
          positive: `${matches.length} AI-keyword hit(s) were found in commit text or file paths.`,
          metrics: [
            { label: 'AI keyword hits', value: matches.length, threshold: '>= 1' },
            { label: 'severity upgrade', value: matches.length >= 30 ? 'major' : 'notable', threshold: 'major at >= 30 hits' },
            { label: 'first hit', value: shortDate(matches[0].date) },
          ],
        },
        idSuffix: String(yearOf(matches[0].date)),
      }),
    ];
  },
};

const BUG_KEYWORDS = /\b(fix|bug|hotfix|revert|rollback|patch|regression|crash|broken)\b/i;

const bugPlagueDetector: Detector = {
  type: 'bug-plague',
  run(repo) {
    if (repo.commits.length < 50) return [];
    // Group commits per month, count bug-keyword commits, find anomalies.
    const monthCounts = new Map<string, { total: number; bugs: number; firstDate: string; lastDate: string }>();
    for (const c of repo.commits) {
      const month = c.date.slice(0, 7);
      let entry = monthCounts.get(month);
      if (!entry) {
        entry = { total: 0, bugs: 0, firstDate: c.date, lastDate: c.date };
        monthCounts.set(month, entry);
      }
      entry.total += 1;
      if (BUG_KEYWORDS.test(`${c.subject} ${c.body ?? ''}`)) entry.bugs += 1;
      if (new Date(c.date) < new Date(entry.firstDate)) entry.firstDate = c.date;
      if (new Date(c.date) > new Date(entry.lastDate)) entry.lastDate = c.date;
    }
    const ratios = [...monthCounts.entries()]
      .filter(([, v]) => v.total >= 10)
      .map(([month, v]) => ({ month, ratio: v.bugs / v.total, ...v }));
    if (ratios.length === 0) return [];
    ratios.sort((a, b) => b.ratio - a.ratio);
    const peak = ratios[0];
    if (peak.ratio < 0.4 || peak.bugs < 8) return [];
    const evidence = [
      `${peak.bugs} of ${peak.total} commits in ${peak.month} were bug-themed (${(peak.ratio * 100).toFixed(0)}%)`,
    ];
    const sample = repo.commits
      .filter((c) => c.date.slice(0, 7) === peak.month && BUG_KEYWORDS.test(c.subject))
      .slice(0, 4);
    for (const c of sample) evidence.push(`${shortDate(c.date)}: "${c.subject}"`);
    return [
      makeEvent({
        type: 'bug-plague',
        title: 'Bug Plague',
        startDate: peak.firstDate,
        endDate: peak.lastDate,
        severity: 'notable',
        confidence: clamp01(0.4 + peak.ratio),
        narrative:
          'A miasma of regressions rolled across the project. Hotfix banners crowded the changelog faster than the scribes could pin them.',
        evidence,
        debug: {
          detector: 'bug-plague',
          positive: `${peak.bugs}/${peak.total} commits in ${peak.month} were bug-themed.`,
          metrics: [
            { label: 'bug-themed commits', value: peak.bugs, threshold: '>= 8' },
            { label: 'bug-themed ratio', value: `${(peak.ratio * 100).toFixed(0)}%`, threshold: '>= 40%' },
            { label: 'month total commits', value: peak.total, threshold: '>= 10' },
          ],
        },
        idSuffix: peak.month,
      }),
    ];
  },
};

const releaseEmpireDetector: Detector = {
  type: 'release-empire',
  run(repo) {
    if (repo.tags.length < 5) return [];
    const dated = repo.tags.filter((t) => t.date);
    if (dated.length < 5) return [];
    dated.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    const start = dated[0].date!;
    const end = dated[dated.length - 1].date!;
    const evidence = [
      `${dated.length} tags found between ${shortDate(start)} and ${shortDate(end)}`,
      `Earliest tag: ${dated[0].name}`,
      `Latest tag: ${dated[dated.length - 1].name}`,
    ];
    const semverish = dated.filter((t) => /^v?\d+\.\d+\.\d+/.test(t.name));
    if (semverish.length > 0) evidence.push(`${semverish.length} tag(s) follow a SemVer-ish pattern`);
    const severity: EventSeverity =
      dated.length >= 50 ? 'epoch-defining' : dated.length >= 20 ? 'major' : 'notable';
    return [
      makeEvent({
        type: 'release-empire',
        title: 'Release Empire',
        startDate: start,
        endDate: end,
        severity,
        confidence: clamp01(0.4 + Math.min(0.4, dated.length / 100)),
        narrative:
          'Versioned banners flew over every milestone. Tags multiplied like bureaucratic decrees, marking a steady cadence of triumphs and rollbacks alike.',
        evidence,
        debug: {
          detector: 'release-empire',
          positive: `${dated.length} dated tag(s) were found.`,
          metrics: [
            { label: 'dated tags', value: dated.length, threshold: '>= 5' },
            { label: 'SemVer-ish tags', value: semverish.length },
            { label: 'release span', value: `${shortDate(start)}–${shortDate(end)}` },
          ],
        },
        idSuffix: String(yearOf(start)),
      }),
    ];
  },
};

export const ALL_DETECTORS: Detector[] = [
  initialChaosDetector,
  typescriptInvasionDetector,
  greatRefactorDetector,
  testingFamineDetector,
  testingRenaissanceDetector,
  lintingTheocracyDetector,
  containerEmpireDetector,
  monorepoFederationDetector,
  dependencyCataclysmDetector,
  founderExodusDetector,
  newDynastyDetector,
  aiPriesthoodDetector,
  bugPlagueDetector,
  releaseEmpireDetector,
];

export function runDetectors(
  analyzed: AnalyzedRepo,
  detectors: Detector[] = ALL_DETECTORS,
): { events: DetectedEvent[]; ran: string[] } {
  const events: DetectedEvent[] = [];
  const ran: string[] = [];
  for (const d of detectors) {
    ran.push(d.type);
    try {
      const out = d.run(analyzed);
      for (const ev of out) events.push(ev);
    } catch {
      // skip individual detector failures rather than abort the whole saga
    }
  }
  events.sort((a, b) => {
    const at = new Date(a.startDate).getTime();
    const bt = new Date(b.startDate).getTime();
    if (at !== bt) return at - bt;
    return b.score - a.score;
  });
  return { events, ran };
}

// ---- helpers used above -------------------------------------------------

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function shortDate(iso: string): string {
  if (!iso) return '?';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function prettyKind(kind: SignalFileKind): string {
  switch (kind) {
    case 'tsconfig':
      return 'tsconfig.json';
    case 'package-json':
      return 'package.json';
    case 'go-mod':
      return 'go.mod';
    case 'docker-compose':
      return 'docker-compose';
    case 'github-workflow':
      return 'GitHub Actions';
    case 'gitlab-ci':
      return 'GitLab CI';
    case 'pnpm-workspace':
      return 'pnpm-workspace';
    case 'lint-staged':
      return 'lint-staged';
    default:
      return kind;
  }
}

function countFounders(commits: RawCommit[]): string[] {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const k = c.authorName || c.authorEmail || 'unknown';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function findNewTopLevelDirs(repo: AnalyzedRepo, startISO: string, endISO: string): string[] {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const dirs = new Set<string>();
  for (const [path, firstSeen] of Object.entries(repo.firstSeen)) {
    const t = new Date(firstSeen).getTime();
    if (t < startMs || t > endMs) continue;
    const top = path.split('/')[0];
    if (!top) continue;
    if (top.startsWith('.')) continue;
    dirs.add(top);
  }
  return [...dirs];
}

function earliestPathDate(repo: AnalyzedRepo, prefixes: string[]): string | undefined {
  let best: string | undefined;
  for (const [p, firstSeen] of Object.entries(repo.firstSeen)) {
    if (!prefixes.some((pre) => p.startsWith(pre))) continue;
    if (!best || new Date(firstSeen) < new Date(best)) best = firstSeen;
  }
  return best;
}

function quantileDate(commits: RawCommit[], q: number): number | undefined {
  if (commits.length === 0) return undefined;
  // commits already sorted oldest -> newest
  const idx = Math.min(commits.length - 1, Math.floor(commits.length * q));
  return new Date(commits[idx].date).getTime();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

// Re-exported to keep the SignalFile type referenced even if not used in some configs.
export type { SignalFile };

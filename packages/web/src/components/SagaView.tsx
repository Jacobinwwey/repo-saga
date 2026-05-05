import { useMemo, useState } from 'react';
import type { DetectedEvent, Era, EvidenceLink, Saga } from '@repo-saga/core';
import {
  composeEraSummary,
  translateEvidence,
  translateSaga,
  type Lang,
} from '@repo-saga/renderer/i18n';
import { formatNumber, formatTemplate, type UiCopy, type UiLang } from '../i18n';
import type { ThemeName } from '../theme';

interface Props {
  saga: Saga;
  theme: ThemeName;
  themeLabel: string;
  lang: UiLang;
  copy: UiCopy['saga'];
  downloadSvgUrl?: string;
  downloadJsonUrl?: string;
  downloadMdUrl?: string;
}

export function SagaView({
  saga,
  theme,
  themeLabel,
  lang,
  copy,
  downloadSvgUrl,
  downloadJsonUrl,
  downloadMdUrl,
}: Props) {
  const timeTravelSnapshots = saga.stats.timeTravelSnapshots ?? [];
  const timelineYears = useMemo(() => yearsInSaga(saga), [saga]);
  const maxSnapshotIndex = Math.max(0, timeTravelSnapshots.length - 1);
  const [selectedEra, setSelectedEra] = useState<string | undefined>(saga.eras[0]?.id);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number>(maxSnapshotIndex);
  const [selectedContributorKey, setSelectedContributorKey] = useState<string | undefined>();
  const [expandedDebug, setExpandedDebug] = useState<string | undefined>();
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedSnapshot = timeTravelSnapshots[Math.min(selectedSnapshotIndex, maxSnapshotIndex)];
  const selectedYear = selectedSnapshot ? Number(selectedSnapshot.date.slice(0, 4)) : timelineYears[timelineYears.length - 1] ?? new Date().getFullYear();

  const localizedSaga = useMemo(() => translateSaga(saga, lang as Lang), [saga, lang]);
  const rawEventById = useMemo(() => new Map(saga.events.map((event) => [event.id, event])), [saga.events]);
  const rawEraById = useMemo(() => new Map(saga.eras.map((era) => [era.id, era])), [saga.eras]);
  const contributorKeys = useMemo(() => Object.keys(saga.stats.contributorTimeline ?? {}), [saga.stats.contributorTimeline]);

  const selectedContributor = selectedContributorKey
    ? saga.stats.contributorTimeline?.[selectedContributorKey]
    : undefined;
  const perspectiveEvents = useMemo(
    () => rewriteEventsForContributor(localizedSaga.events, selectedContributor, selectedContributorKey, copy),
    [localizedSaga.events, selectedContributor, selectedContributorKey, copy],
  );

  const activeEra = localizedSaga.eras.find((e) => e.id === selectedEra) ?? localizedSaga.eras[0];
  const eventsInEra = activeEra
    ? perspectiveEvents.filter((ev) => ev.endYear >= activeEra.startYear && ev.startYear <= activeEra.endYear)
    : [];

  const localizedJson = useMemo(
    () => ({
      ...localizedSaga,
      eras: localizedSaga.eras.map((era) => ({
        ...era,
        summary: eraSummary(era),
        evidence: eraEvidence(era),
      })),
      events: localizedSaga.events.map((event) => ({
        ...event,
        evidence: event.evidence.map((item) => translateEvidence(item, lang as Lang)),
      })),
    }),
    [localizedSaga, lang],
  );

  async function copyMarkdown() {
    if (!downloadMdUrl) return;
    try {
      const res = await fetch(downloadMdUrl);
      const md = await res.text();
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  }

  function eraSummary(era: Era): string {
    const rawEra = rawEraById.get(era.id) ?? era;
    return lang === 'zh' ? composeEraSummary(rawEra, saga.events, lang as Lang) : rawEra.summary;
  }

  function eraEvidence(era: Era): string[] {
    const rawEra = rawEraById.get(era.id) ?? era;
    return rawEra.evidence.map((item) => translateEvidence(item, lang as Lang));
  }

  function onTimeTravel(snapshotIndex: number) {
    setSelectedSnapshotIndex(snapshotIndex);
    const snapshot = timeTravelSnapshots[snapshotIndex];
    const year = snapshot ? Number(snapshot.date.slice(0, 4)) : selectedYear;
    const eraAtYear = localizedSaga.eras.find((era) => era.startYear <= year && era.endYear >= year);
    if (eraAtYear) setSelectedEra(eraAtYear.id);
  }

  return (
    <div className="rs-saga">
      <header className="rs-saga-header">
        <div>
          <h2>{formatTemplate(copy.title, { name: saga.repo.name })}</h2>
          <p className="rs-saga-meta">
            <span>
              {formatNumber(saga.repo.commitCount, lang)} {copy.commits}
            </span>
            <span>·</span>
            <span>
              {formatNumber(saga.repo.contributors, lang)} {copy.contributors}
            </span>
            <span>·</span>
            <span>
              {formatNumber(saga.repo.tagCount, lang)} {copy.tags}
            </span>
            <span>·</span>
            <span>
              {formatNumber(saga.eras.length, lang)} {copy.eras}
            </span>
            <span>·</span>
            <span>
              {formatNumber(saga.events.length, lang)} {copy.events}
            </span>
          </p>
        </div>
        <div className="rs-saga-actions">
          {downloadSvgUrl && (
            <a className="rs-btn" href={downloadSvgUrl} download={`${saga.repo.name}-saga.svg`}>
              {copy.downloadSvg}
            </a>
          )}
          {downloadMdUrl && (
            <button className="rs-btn" type="button" onClick={copyMarkdown}>
              {copied ? `${copy.copied} ✓` : copy.copyMarkdown}
            </button>
          )}
          {downloadJsonUrl && (
            <a className="rs-btn" href={downloadJsonUrl} download={`${saga.repo.name}-saga.json`}>
              {copy.downloadJson}
            </a>
          )}
          <button className="rs-btn" type="button" onClick={() => setShowJson((v) => !v)}>
            {showJson ? copy.hideJson : copy.viewJson}
          </button>
        </div>
      </header>

      <section className="rs-interaction-shell" aria-label={copy.workspaceLabel}>
        <div className="rs-oracle-panel">
          <div className="rs-oracle-image" aria-hidden="true" />
          <div>
            <p className="rs-kicker">{copy.workspaceKicker}</p>
            <h3>{copy.workspaceTitle}</h3>
            <p>{copy.workspaceBody}</p>
          </div>
        </div>
        <TimeTravel
          events={localizedSaga.events}
          snapshots={timeTravelSnapshots}
          selectedSnapshotIndex={Math.min(selectedSnapshotIndex, maxSnapshotIndex)}
          lang={lang}
          copy={copy}
          onSnapshot={onTimeTravel}
        />
        <ContributorPerspective
          saga={saga}
          contributorKeys={contributorKeys}
          selectedKey={selectedContributorKey}
          selectedYear={selectedYear}
          lang={lang}
          copy={copy}
          onContributor={setSelectedContributorKey}
        />
      </section>

      {downloadSvgUrl && (
        <div className="rs-saga-poster">
          <img
            src={downloadSvgUrl}
            alt={formatTemplate(copy.posterAlt, { name: saga.repo.name, theme: themeLabel || theme })}
          />
        </div>
      )}

      <div className="rs-saga-grid">
        <ol className="rs-era-list">
          {localizedSaga.eras.map((era) => (
            <li key={era.id}>
              <button
                type="button"
                className={`rs-era-item${era.id === activeEra?.id ? ' rs-active' : ''}`}
                onClick={() => {
                  setSelectedEra(era.id);
                  const eraSnapshotIndex = findNearestSnapshotIndex(timeTravelSnapshots, era.startYear, Math.min(selectedSnapshotIndex, maxSnapshotIndex));
                  setSelectedSnapshotIndex(eraSnapshotIndex);
                }}
              >
                <span className="rs-era-numerals">{era.id.replace('era-', '')}</span>
                <span className="rs-era-text">
                  <h3>{era.name}</h3>
                  <p>
                    <small>
                      {era.startYear}–{era.endYear} · {era.theme}
                    </small>
                  </p>
                  <p className="rs-era-summary">{eraSummary(era)}</p>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="rs-event-panel">
          <h3>{activeEra ? activeEra.name : copy.noEraSelected}</h3>
          {selectedContributor && (
            <p className="rs-perspective-note">
              {formatTemplate(copy.perspectiveNote, {
                name: selectedContributor.name || selectedContributor.email,
                firstYear: selectedContributor.firstYear,
              })}
            </p>
          )}
          {activeEra && activeEra.evidence.length > 0 && (
            <ul className="rs-evidence-list">
              {eraEvidence(activeEra).map((ev, idx) => (
                <li key={idx}>{ev}</li>
              ))}
            </ul>
          )}
          <h4>{copy.events}</h4>
          {eventsInEra.length === 0 && <p className="rs-empty">{copy.noEvents}</p>}
          {eventsInEra.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              rawEvent={rawEventById.get(ev.id) ?? ev}
              links={saga.stats.evidenceLinks?.[ev.id] ?? []}
              lang={lang}
              copy={copy}
              debugOpen={expandedDebug === ev.id}
              onToggleDebug={() => setExpandedDebug((current) => (current === ev.id ? undefined : ev.id))}
            />
          ))}
        </div>
      </div>

      {showJson && (
        <div className="rs-json">
          <pre>{JSON.stringify(localizedJson, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function TimeTravel({
  events,
  snapshots,
  selectedSnapshotIndex,
  lang,
  copy,
  onSnapshot,
}: {
  events: DetectedEvent[];
  snapshots: NonNullable<Saga['stats']['timeTravelSnapshots']>;
  selectedSnapshotIndex: number;
  lang: UiLang;
  copy: UiCopy['saga'];
  onSnapshot: (snapshotIndex: number) => void;
}) {
  const max = Math.max(0, snapshots.length - 1);
  const snapshot = snapshots[Math.min(selectedSnapshotIndex, max)];
  const selectedYear = snapshot ? snapshot.date.slice(0, 4) : '';
  const minLabel = snapshots[0]?.date ?? '';
  const maxLabel = snapshots[max]?.date ?? '';
  const commits = snapshot?.commits ?? 0;
  const contributors = snapshot?.activeContributors.length ?? 0;
  const files = snapshot?.activeFiles ?? [];
  const detectorIds = snapshot?.activeDetectorEvents ?? [];
  const eventNames = detectorIds
    .map((id) => events.find((event) => event.id === id)?.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 3);

  return (
    <div className="rs-time-panel">
      <div className="rs-panel-heading">
        <p className="rs-kicker">{copy.timeTravel}</p>
        <strong>{formatTemplate(copy.timeTravelSubtitle, { date: snapshot?.date ?? selectedYear })}</strong>
      </div>
      <input
        className="rs-time-slider"
        type="range"
        min={0}
        max={max}
        step="1"
        value={Math.min(selectedSnapshotIndex, max)}
        onChange={(event) => onSnapshot(Number(event.currentTarget.value))}
      />
      <div className="rs-time-years" aria-hidden="true">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <div className="rs-time-stats">
        <Metric value={formatNumber(commits, lang)} label={copy.activeCommits} />
        <Metric value={formatNumber(contributors, lang)} label={copy.activeContributors} />
        <Metric value={formatNumber(detectorIds.length, lang)} label={copy.activeDetectorEvents} />
      </div>
      <div className="rs-time-columns">
        <EvidenceMiniList title={copy.activeFiles} items={files} empty={copy.none} />
        <EvidenceMiniList title={copy.activeDetectorEvents} items={eventNames} empty={copy.none} />
      </div>
    </div>
  );
}

function ContributorPerspective({
  saga,
  contributorKeys,
  selectedKey,
  selectedYear,
  lang,
  copy,
  onContributor,
}: {
  saga: Saga;
  contributorKeys: string[];
  selectedKey?: string;
  selectedYear: number;
  lang: UiLang;
  copy: UiCopy['saga'];
  onContributor: (key: string | undefined) => void;
}) {
  const selected = selectedKey ? saga.stats.contributorTimeline?.[selectedKey] : undefined;
  const topContributors = contributorKeys.slice(0, 10);
  const yearContributors = saga.stats.activeContributorsByYear?.[String(selectedYear)] ?? [];
  const totalCommits = selected ? Object.values(selected.commitsByYear).reduce((sum, count) => sum + count, 0) : 0;
  const commitsThisYear = selected?.commitsByYear[String(selectedYear)] ?? 0;

  return (
    <div className="rs-contributor-panel">
      <div className="rs-panel-heading">
        <p className="rs-kicker">{copy.contributorMode}</p>
        <strong>{selected ? selected.name || selected.email : copy.allContributors}</strong>
      </div>
      <div className="rs-contributor-pills" role="list" aria-label={copy.contributorMode}>
        <button
          type="button"
          className={`rs-contributor-pill${!selectedKey ? ' rs-active' : ''}`}
          onClick={() => onContributor(undefined)}
        >
          {copy.allContributors}
        </button>
        {topContributors.map((key) => {
          const contributor = saga.stats.contributorTimeline?.[key];
          return (
            <button
              type="button"
              className={`rs-contributor-pill${key === selectedKey ? ' rs-active' : ''}`}
              key={key}
              onClick={() => onContributor(key)}
            >
              {contributor?.name || contributor?.email || key}
            </button>
          );
        })}
      </div>
      <div className="rs-contributor-body">
        {selected ? (
          <>
            <p className="rs-contributor-voice">
              {formatTemplate(copy.contributorVoice, {
                name: selected.name || selected.email,
                firstYear: selected.firstYear,
                commits: formatNumber(totalCommits, lang),
              })}
            </p>
            <div className="rs-time-stats">
              <Metric value={formatNumber(commitsThisYear, lang)} label={copy.yearCommits} />
              <Metric value={`${selected.firstYear}–${selected.lastYear}`} label={copy.activeYears} />
            </div>
            <EvidenceMiniList title={copy.touchedFiles} items={selected.topFiles} empty={copy.none} />
          </>
        ) : (
          <EvidenceMiniList
            title={formatTemplate(copy.topContributorsAtYear, { year: selectedYear })}
            items={yearContributors.map((contributor) => `${contributor.name || contributor.email} · ${formatNumber(contributor.commits, lang)}`)}
            empty={copy.none}
          />
        )}
      </div>
    </div>
  );
}

function EventCard({
  event,
  rawEvent,
  links,
  lang,
  copy,
  debugOpen,
  onToggleDebug,
}: {
  event: DetectedEvent;
  rawEvent: DetectedEvent;
  links: EvidenceLink[];
  lang: UiLang;
  copy: UiCopy['saga'];
  debugOpen: boolean;
  onToggleDebug: () => void;
}) {
  const debug = rawEvent.debug;
  return (
    <article className={`rs-event rs-sev-${event.severity}`} id={`event-${event.id}`}>
      <header>
        <strong>{event.title}</strong>
        <span className="rs-event-range">
          {event.startYear === event.endYear ? String(event.startYear) : `${event.startYear}–${event.endYear}`}
        </span>
        <span className="rs-event-sev">{copy.severityLabels[event.severity]}</span>
      </header>
      <p className="rs-event-narrative">{event.narrative}</p>
      <ul className="rs-event-evidence">
        {event.evidence.map((e, i) => (
          <li key={i}>{translateEvidence(e, lang as Lang)}</li>
        ))}
      </ul>
      {links.length > 0 && (
        <div className="rs-evidence-links" aria-label={copy.evidenceLinks}>
          {links.map((link) => (
            <a key={`${link.kind}:${link.url}`} href={link.url} target="_blank" rel="noreferrer">
              {linkLabel(link, copy)}
            </a>
          ))}
        </div>
      )}
      <footer>
        <span>
          {copy.confidence}: <strong>{(event.confidence * 100).toFixed(0)}%</strong>
        </span>
        {debug && (
          <button className="rs-debug-toggle" type="button" onClick={onToggleDebug}>
            {debugOpen ? copy.hideDebug : copy.showDebug}
          </button>
        )}
      </footer>
      {debug && debugOpen && <DebugPanel debug={debug} copy={copy} />}
    </article>
  );
}

function DebugPanel({ debug, copy }: { debug: NonNullable<DetectedEvent['debug']>; copy: UiCopy['saga'] }) {
  return (
    <div className="rs-debug-panel">
      <p>
        <strong>{copy.positiveRoute}</strong> {localizeDebugText(debug.positive, copy)}
      </p>
      {debug.negative && (
        <p>
          <strong>{copy.negativeRoute}</strong> {localizeDebugText(debug.negative, copy)}
        </p>
      )}
      <dl>
        {debug.metrics.map((metric) => (
          <div key={`${metric.label}:${metric.value}`}>
            <dt>{localizeDebugLabel(metric.label, copy)}</dt>
            <dd>
              <span>{localizeDebugValue(metric.value, copy)}</span>
              {metric.threshold !== undefined && <small>{copy.threshold}: {localizeDebugValue(metric.threshold, copy)}</small>}
              {metric.delta !== undefined && <small>{copy.distance}: {localizeDebugValue(metric.delta, copy)}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}


function localizeDebugLabel(label: string, copy: UiCopy['saga']): string {
  return copy.debugMetricLabels[label] ?? label;
}

function localizeDebugValue(value: string | number, copy: UiCopy['saga']): string {
  if (typeof value === 'number') return String(value);
  return copy.debugValueLabels[value] ?? localizeDebugText(value, copy);
}

function localizeDebugText(text: string | undefined, copy: UiCopy['saga']): string {
  if (!text) return '';
  let output = text;
  for (const [from, to] of Object.entries(DEBUG_TEXT_TRANSLATIONS)) {
    output = output.replace(new RegExp(escapeRegExp(from), 'g'), to);
  }
  for (const [from, to] of Object.entries(copy.debugMetricLabels)) {
    output = output.replace(new RegExp(escapeRegExp(from), 'g'), to);
  }
  for (const [from, to] of Object.entries(copy.debugValueLabels)) {
    output = output.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g'), to);
  }
  return output;
}

const DEBUG_TEXT_TRANSLATIONS: Record<string, string> = {
  'Founding window crossed the': '奠基窗口越过',
  'commit threshold.': '提交阈值。',
  'TypeScript share crossed 50% in': 'TypeScript 占比在',
  'TypeScript configuration appeared at': 'TypeScript 配置出现于',
  'TypeScript insertions crossed the 5% discovery threshold in': 'TypeScript 插入量在以下年份越过 5% 发现阈值：',
  'No year reached the 50% TypeScript-majority threshold.': '没有年份达到 TypeScript 50% 多数阈值。',
  'A 90-day window changed': '一个 90 天窗口改动了',
  'files, above the': '个文件，高于',
  'file threshold.': '文件阈值。',
  'Test insertion ratio stayed below 5% for': '测试插入比例低于 5%，持续',
  'year(s).': '年。',
  'Touched test files jumped from': '触及测试文件数从',
  'to': '跃升到',
  'No year-over-year test-file surge was large enough; tool appearance triggered the event.': '没有足够大的同比测试文件跃升；由测试工具出现触发该事件。',
  'formatting/linting signal file(s) appeared.': '个格式化/lint 信号文件出现。',
  'container/infrastructure signal file(s) appeared.': '个容器/基础设施信号文件出现。',
  'workspace orchestrator signal(s)': '个工作区编排信号',
  'plus packages/': '加上 packages/',
  'plus apps/': '加上 apps/',
  'were found.': '被发现。',
  'Largest lockfile churn touched': '最大 lockfile 变动触及',
  'lines.': '行。',
  'early contributor(s) stopped before the final quartile.': '位早期贡献者在最后四分位前停止活跃。',
  'late-arriving contributor(s) crossed the dynasty threshold.': '位后期加入贡献者越过新王朝阈值。',
  'AI-keyword hit(s) were found in commit text or file paths.': '处 AI 关键词命中出现在提交文本或文件路径中。',
  'commits in': '次提交位于',
  'were bug-themed.': '属于 bug 主题。',
  'dated tag(s) were found.': '个带日期 tag 被发现。',
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rs-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EvidenceMiniList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rs-mini-list">
      <strong>{title}</strong>
      {items.length > 0 ? (
        <ul>
          {items.slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

function yearsInSaga(saga: Saga): number[] {
  const years = new Set<number>();
  for (const year of Object.keys(saga.stats.commitsByYear)) years.add(Number(year));
  for (const era of saga.eras) {
    for (let year = era.startYear; year <= era.endYear; year++) years.add(year);
  }
  return [...years].filter(Number.isFinite).sort((a, b) => a - b);
}

function rewriteEventsForContributor(
  events: DetectedEvent[],
  contributor: NonNullable<Saga['stats']['contributorTimeline']>[string] | undefined,
  contributorKey: string | undefined,
  copy: UiCopy['saga'],
): DetectedEvent[] {
  if (!contributor || !contributorKey) return events;
  const years = new Set(Object.keys(contributor.commitsByYear).map(Number));
  return events.map((event) => {
    const overlaps = [...years].some((year) => year >= event.startYear && year <= event.endYear);
    if (!overlaps) return event;
    return {
      ...event,
      narrative: formatTemplate(copy.contributorNarrativePrefix, {
        firstYear: contributor.firstYear,
        narrative: event.narrative,
      }),
    };
  });
}

function linkLabel(link: EvidenceLink, copy: UiCopy['saga']): string {
  const prefix = copy.evidenceLinkKinds[link.kind] ?? copy.evidenceLinks;
  return `${prefix}: ${link.label}`;
}

function findNearestSnapshotIndex(
  snapshots: NonNullable<Saga['stats']['timeTravelSnapshots']>,
  year: number,
  fallback: number,
): number {
  if (snapshots.length === 0) return 0;
  const target = Date.UTC(year, 6, 1);
  let best = Math.min(fallback, snapshots.length - 1);
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < snapshots.length; i++) {
    const snapshotDate = new Date(`${snapshots[i].date}T00:00:00Z`).getTime();
    const distance = Math.abs(snapshotDate - target);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

// type-only re-export to ensure Era is referenced
export type { Era };

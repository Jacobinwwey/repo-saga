import { useMemo, useState } from 'react';
import type { Saga, Era, DetectedEvent } from '@repo-saga/core';
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
  const [selectedEra, setSelectedEra] = useState<string | undefined>(saga.eras[0]?.id);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const localizedSaga = useMemo(() => translateSaga(saga, lang as Lang), [saga, lang]);
  const rawEraById = useMemo(() => new Map(saga.eras.map((era) => [era.id, era])), [saga.eras]);
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

  const activeEra = localizedSaga.eras.find((e) => e.id === selectedEra) ?? localizedSaga.eras[0];
  const eventsInEra = activeEra
    ? localizedSaga.events.filter((ev) => ev.endYear >= activeEra.startYear && ev.startYear <= activeEra.endYear)
    : [];

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
            <li
              key={era.id}
              className={`rs-era-item${era.id === activeEra?.id ? ' rs-active' : ''}`}
              onClick={() => setSelectedEra(era.id)}
            >
              <div className="rs-era-numerals">{era.id.replace('era-', '')}</div>
              <div className="rs-era-text">
                <h3>{era.name}</h3>
                <p>
                  <small>
                    {era.startYear}–{era.endYear} · {era.theme}
                  </small>
                </p>
                <p className="rs-era-summary">{eraSummary(era)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rs-event-panel">
          <h3>{activeEra ? activeEra.name : copy.noEraSelected}</h3>
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
            <EventCard key={ev.id} event={ev} lang={lang} copy={copy} />
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

function EventCard({
  event,
  lang,
  copy,
}: {
  event: DetectedEvent;
  lang: UiLang;
  copy: UiCopy['saga'];
}) {
  return (
    <article className={`rs-event rs-sev-${event.severity}`}>
      <header>
        <strong>{event.title}</strong>
        <span className="rs-event-range">
          {event.startYear === event.endYear
            ? String(event.startYear)
            : `${event.startYear}–${event.endYear}`}
        </span>
        <span className="rs-event-sev">{copy.severityLabels[event.severity]}</span>
      </header>
      <p className="rs-event-narrative">{event.narrative}</p>
      <ul className="rs-event-evidence">
        {event.evidence.map((e, i) => (
          <li key={i}>{translateEvidence(e, lang as Lang)}</li>
        ))}
      </ul>
      <footer>
        {copy.confidence}: <strong>{(event.confidence * 100).toFixed(0)}%</strong>
      </footer>
    </article>
  );
}

// type-only re-export to ensure Era is referenced
export type { Era };

import { useState } from 'react';
import type { Saga, Era, DetectedEvent } from '@repo-saga/core';
import { ThemeName } from '../theme';

interface Props {
  saga: Saga;
  theme: ThemeName;
  downloadSvgUrl?: string;
  downloadJsonUrl?: string;
  downloadMdUrl?: string;
}

export function SagaView({ saga, theme, downloadSvgUrl, downloadJsonUrl, downloadMdUrl }: Props) {
  const [selectedEra, setSelectedEra] = useState<string | undefined>(saga.eras[0]?.id);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeEra = saga.eras.find((e) => e.id === selectedEra) ?? saga.eras[0];
  const eventsInEra = activeEra
    ? saga.events.filter((ev) => ev.endYear >= activeEra.startYear && ev.startYear <= activeEra.endYear)
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

  return (
    <div className="rs-saga">
      <header className="rs-saga-header">
        <div>
          <h2>The Civilization of {saga.repo.name}</h2>
          <p className="rs-saga-meta">
            <span>{saga.repo.commitCount.toLocaleString()} commits</span>
            <span>·</span>
            <span>{saga.repo.contributors} contributors</span>
            <span>·</span>
            <span>{saga.repo.tagCount} tags</span>
            <span>·</span>
            <span>{saga.eras.length} eras</span>
            <span>·</span>
            <span>{saga.events.length} events</span>
          </p>
        </div>
        <div className="rs-saga-actions">
          {downloadSvgUrl && (
            <a className="rs-btn" href={downloadSvgUrl} download={`${saga.repo.name}-saga.svg`}>
              Download SVG
            </a>
          )}
          {downloadMdUrl && (
            <button className="rs-btn" type="button" onClick={copyMarkdown}>
              {copied ? 'Copied ✓' : 'Copy Markdown'}
            </button>
          )}
          {downloadJsonUrl && (
            <a className="rs-btn" href={downloadJsonUrl} download={`${saga.repo.name}-saga.json`}>
              Download JSON
            </a>
          )}
          <button className="rs-btn" type="button" onClick={() => setShowJson((v) => !v)}>
            {showJson ? 'Hide JSON' : 'View JSON'}
          </button>
        </div>
      </header>

      {downloadSvgUrl && (
        <div className="rs-saga-poster">
          <img src={downloadSvgUrl} alt={`${saga.repo.name} civilization poster (${theme} theme)`} />
        </div>
      )}

      <div className="rs-saga-grid">
        <ol className="rs-era-list">
          {saga.eras.map((era) => (
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
                <p className="rs-era-summary">{era.summary}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rs-event-panel">
          <h3>{activeEra ? activeEra.name : 'No era selected'}</h3>
          {activeEra && activeEra.evidence.length > 0 && (
            <ul className="rs-evidence-list">
              {activeEra.evidence.map((ev, idx) => (
                <li key={idx}>{ev}</li>
              ))}
            </ul>
          )}
          <h4>Events</h4>
          {eventsInEra.length === 0 && <p className="rs-empty">No detected events in this era.</p>}
          {eventsInEra.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      </div>

      {showJson && (
        <div className="rs-json">
          <pre>{JSON.stringify(saga, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: DetectedEvent }) {
  return (
    <article className={`rs-event rs-sev-${event.severity}`}>
      <header>
        <strong>{event.title}</strong>
        <span className="rs-event-range">
          {event.startYear === event.endYear
            ? String(event.startYear)
            : `${event.startYear}–${event.endYear}`}
        </span>
        <span className="rs-event-sev">{event.severity}</span>
      </header>
      <p className="rs-event-narrative">{event.narrative}</p>
      <ul className="rs-event-evidence">
        {event.evidence.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      <footer>
        confidence: <strong>{(event.confidence * 100).toFixed(0)}%</strong>
      </footer>
    </article>
  );
}

// type-only re-export to ensure Era is referenced
export type { Era };

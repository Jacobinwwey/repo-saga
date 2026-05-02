import type { ProgressEvent } from '@repo-saga/core';
import { localizeProgressMessage, type UiCopy, type UiLang } from '../i18n';

interface Props {
  events: ProgressEvent[];
  status: 'queued' | 'running' | 'done' | 'error';
  lang: UiLang;
  copy: UiCopy['progress'];
}

export function ProgressPanel({ events, status, lang, copy }: Props) {
  const last = events[events.length - 1];
  const progress = events.reduceRight<number | undefined>((acc, ev) => {
    if (acc !== undefined) return acc;
    return ev.progress;
  }, undefined);
  return (
    <div className="rs-progress-panel">
      <div className="rs-progress-header">
        <strong>{copy.status}:</strong> <code>{copy.statusLabels[status]}</code>{' '}
        {last && <span className="rs-progress-message">{localizeProgressMessage(last, lang)}</span>}
      </div>
      {progress !== undefined && (
        <div className="rs-progress-bar">
          <div className="rs-progress-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <ol className="rs-progress-log" reversed>
        {[...events].reverse().slice(0, 20).map((ev, idx) => (
          <li key={`${ev.phase}-${idx}-${ev.message}`}>
            <span className="rs-progress-phase">{copy.phaseLabels[ev.phase]}</span>
            <span>{localizeProgressMessage(ev, lang)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

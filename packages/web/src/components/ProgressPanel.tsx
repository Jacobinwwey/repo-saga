import type { ProgressEvent } from '@repo-saga/core';

interface Props {
  events: ProgressEvent[];
  status: 'queued' | 'running' | 'done' | 'error';
}

export function ProgressPanel({ events, status }: Props) {
  const last = events[events.length - 1];
  const progress = events.reduceRight<number | undefined>((acc, ev) => {
    if (acc !== undefined) return acc;
    return ev.progress;
  }, undefined);
  return (
    <div className="rs-progress-panel">
      <div className="rs-progress-header">
        <strong>Status:</strong> <code>{status}</code>{' '}
        {last && <span className="rs-progress-message">{last.message}</span>}
      </div>
      {progress !== undefined && (
        <div className="rs-progress-bar">
          <div className="rs-progress-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <ol className="rs-progress-log" reversed>
        {[...events].reverse().slice(0, 20).map((ev, idx) => (
          <li key={`${ev.phase}-${idx}-${ev.message}`}>
            <span className="rs-progress-phase">{ev.phase}</span>
            <span>{ev.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

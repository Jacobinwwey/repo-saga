import { useEffect, useMemo, useState } from 'react';
import type { ProgressEvent, Saga } from '@repo-saga/core';
import { normalizeLang } from '@repo-saga/renderer';
import { SagaForm } from './components/SagaForm';
import { ProgressPanel } from './components/ProgressPanel';
import { SagaView } from './components/SagaView';
import { Toolbar } from './components/Toolbar';
import { UI_COPY, localizeError, type UiLang } from './i18n';
import { applyTheme, type ThemeName } from './theme';

interface JobView {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  events: ProgressEvent[];
  error?: string;
  saga?: Saga;
}

export function App() {
  const [theme, setTheme] = useState<ThemeName>('epic');
  const [lang, setLang] = useState<UiLang>(() => initialLang());
  const [job, setJob] = useState<JobView | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [initialLoaded, setInitialLoaded] = useState(false);

  // apply theme to body
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh-Hant' ? 'zh-TW' : lang === 'zh' ? 'zh-CN' : lang;
    window.localStorage.setItem('repo-saga-lang', lang);
  }, [lang]);

  const copy = UI_COPY[lang];

  // Fetch initial saga if CLI provided one
  useEffect(() => {
    if (initialLoaded) return;
    fetch('/api/initial')
      .then(async (r) => {
        if (!r.ok) return undefined;
        return (await r.json()) as Saga;
      })
      .then((saga) => {
        if (saga) {
          setJob({
            id: 'initial',
            status: 'done',
            events: [{ phase: 'done', message: 'Saga delivered from CLI' }],
            saga,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => setInitialLoaded(true));
  }, [initialLoaded]);

  async function start(source: string) {
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? copy.errors.jobCreation);
      }
      const data = (await res.json()) as { id: string };
      const newJob: JobView = {
        id: data.id,
        status: 'running',
        events: [],
      };
      setJob(newJob);
      streamProgress(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function streamProgress(jobId: string) {
    const es = new EventSource(`/api/jobs/${jobId}/events`);
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as ProgressEvent;
        setJob((current) => {
          if (!current || current.id !== jobId) return current;
          const events = [...current.events, ev];
          return { ...current, events, status: ev.phase === 'error' ? 'error' : current.status };
        });
        if (ev.phase === 'done') {
          fetchSaga(jobId);
          es.close();
        }
        if (ev.phase === 'error') {
          setError(ev.message);
          es.close();
        }
      } catch {
        // ignore malformed chunks
      }
    };
    es.addEventListener('end', () => es.close());
    es.onerror = () => {
      es.close();
    };
  }

  async function fetchSaga(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/saga.json`);
      if (!res.ok) {
        setError(copy.errors.sagaRetrieval);
        return;
      }
      const saga = (await res.json()) as Saga;
      setJob((current) => (current ? { ...current, saga, status: 'done' } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const downloadSvgUrl = useMemo(() => {
    if (!job?.id || !job?.saga) return undefined;
    return `/api/jobs/${job.id}/saga.svg?theme=${encodeURIComponent(theme)}&lang=${lang}`;
  }, [job?.id, job?.saga, theme, lang]);

  const downloadJsonUrl = useMemo(() => {
    if (!job?.id || !job?.saga) return undefined;
    return `/api/jobs/${job.id}/saga.json?lang=${lang}`;
  }, [job?.id, job?.saga, lang]);

  const downloadMdUrl = useMemo(() => {
    if (!job?.id || !job?.saga) return undefined;
    return `/api/jobs/${job.id}/saga.md?lang=${lang}`;
  }, [job?.id, job?.saga, lang]);

  return (
    <div className="rs-app">
      <header className="rs-header">
        <div className="rs-brand">
          <span className="rs-brand-mark" aria-hidden="true">
            <span className="rs-brand-blade rs-brand-blade-left" />
            <span className="rs-brand-blade rs-brand-blade-right" />
          </span>
          <span className="rs-brand-text">repo-saga</span>
        </div>
        <Toolbar theme={theme} onTheme={setTheme} lang={lang} onLang={setLang} copy={copy.toolbar} />
      </header>
      <main className="rs-main">
        <section className="rs-input">
          <SagaForm onSubmit={start} disabled={submitting || job?.status === 'running'} copy={copy.form} />
          {error && <div className="rs-error">⚠ {localizeError(error, lang)}</div>}
        </section>

        {job && job.status !== 'done' && (
          <section className="rs-progress">
            <ProgressPanel events={job.events} status={job.status} lang={lang} copy={copy.progress} />
          </section>
        )}

        {job?.saga && (
          <section className="rs-result">
            <SagaView
              saga={job.saga}
              theme={theme}
              themeLabel={copy.toolbar.themeLabels[theme]}
              lang={lang}
              copy={copy.saga}
              downloadSvgUrl={downloadSvgUrl}
              downloadJsonUrl={downloadJsonUrl}
              downloadMdUrl={downloadMdUrl}
            />
          </section>
        )}

        {!job && (
          <section className="rs-blurb rs-chronicle-hero">
            <div className="rs-hero-copy">
              <p className="rs-kicker">{copy.hero.kicker}</p>
              <h2>{copy.hero.title}</h2>
              <p>{copy.hero.body}</p>
              <ul>
                {copy.hero.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="rs-hero-art" aria-hidden="true" />
          </section>
        )}
      </main>
      <footer className="rs-footer">
        <span>{copy.footer}</span>
      </footer>
    </div>
  );
}

function initialLang(): UiLang {
  if (typeof window === 'undefined') return 'zh';
  const query = normalizeLang(new URLSearchParams(window.location.search).get('lang') ?? undefined);
  if (query) return query;
  const stored = window.localStorage.getItem('repo-saga-lang');
  const normalizedStored = normalizeLang(stored ?? undefined);
  if (normalizedStored) return normalizedStored;
  return 'zh';
}

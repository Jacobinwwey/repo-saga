import type { FastifyInstance } from 'fastify';
import { renderJson, renderMarkdown, renderSvg, type Lang, type SvgTheme } from '@repo-saga/renderer';
import type { JobStore } from './jobs.js';

const VALID_THEMES: SvgTheme[] = ['epic', 'dark-fantasy', 'academic', 'minimal'];
const VALID_LANGS: Lang[] = ['en', 'zh'];

function pickLang(raw: string | undefined): Lang {
  return (VALID_LANGS as string[]).includes(raw ?? '') ? (raw as Lang) : 'en';
}

export interface RouteOptions {
  jobs: JobStore;
  /** if a pre-computed saga was passed via CLI, expose it under /api/initial */
  initialSagaJson?: string;
}

export async function registerRoutes(app: FastifyInstance, opts: RouteOptions) {
  const { jobs } = opts;

  app.get('/api/health', async () => ({ ok: true }));

  if (opts.initialSagaJson) {
    app.get('/api/initial', async (_req, reply) => {
      reply.header('content-type', 'application/json');
      return opts.initialSagaJson;
    });
  }

  app.post<{ Body: { source: string; maxCommits?: number } }>('/api/jobs', async (req, reply) => {
    const body = req.body ?? ({} as { source?: string; maxCommits?: number });
    if (!body.source || typeof body.source !== 'string') {
      reply.code(400);
      return { error: 'Missing "source" (repo URL or local path)' };
    }
    const job = jobs.start(body.source, { maxCommits: body.maxCommits });
    return { id: job.id, status: job.status, startedAt: job.startedAt };
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id', async (req, reply) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      reply.code(404);
      return { error: 'Job not found' };
    }
    return {
      id: job.id,
      source: job.source,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      events: job.events,
      error: job.error,
      sagaAvailable: Boolean(job.saga),
    };
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id/events', async (req, reply) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      reply.code(404);
      return { error: 'Job not found' };
    }
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    // replay any past events
    for (const ev of job.events) {
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
    }
    if (job.status === 'done' || job.status === 'error') {
      reply.raw.write('event: end\ndata: {}\n\n');
      reply.raw.end();
      return reply;
    }
    const unsubscribe = jobs.subscribe(job.id, (_j, ev) => {
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
      if (ev.phase === 'done' || ev.phase === 'error') {
        reply.raw.write('event: end\ndata: {}\n\n');
        reply.raw.end();
      }
    });
    req.raw.on('close', () => unsubscribe());
    return reply;
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id/saga.json', async (req, reply) => {
    const job = jobs.get(req.params.id);
    if (!job?.saga) {
      reply.code(job ? 425 : 404);
      return { error: job ? 'Saga not yet ready' : 'Job not found' };
    }
    reply.header('content-type', 'application/json; charset=utf-8');
    return renderJson(job.saga);
  });

  app.get<{ Params: { id: string }; Querystring: { lang?: string } }>(
    '/api/jobs/:id/saga.md',
    async (req, reply) => {
      const job = jobs.get(req.params.id);
      if (!job?.saga) {
        reply.code(job ? 425 : 404);
        return { error: job ? 'Saga not yet ready' : 'Job not found' };
      }
      reply.header('content-type', 'text/markdown; charset=utf-8');
      return renderMarkdown(job.saga, { lang: pickLang(req.query?.lang) });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { theme?: string; lang?: string } }>(
    '/api/jobs/:id/saga.svg',
    async (req, reply) => {
      const job = jobs.get(req.params.id);
      if (!job?.saga) {
        reply.code(job ? 425 : 404);
        return { error: job ? 'Saga not yet ready' : 'Job not found' };
      }
      const themeParam = req.query?.theme;
      const theme: SvgTheme = (VALID_THEMES as string[]).includes(themeParam ?? '')
        ? (themeParam as SvgTheme)
        : 'epic';
      const lang = pickLang(req.query?.lang);
      reply.header('content-type', 'image/svg+xml; charset=utf-8');
      return renderSvg(job.saga, { theme, lang });
    },
  );
}

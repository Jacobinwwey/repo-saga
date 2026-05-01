import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JobStore } from './jobs.js';
import { registerRoutes } from './routes.js';
import type { Saga } from '@repo-saga/core';

export interface ServerOptions {
  port?: number;
  host?: string;
  /** absolute path of built static UI to serve */
  webRoot?: string;
  /** an already-computed saga (from CLI) — exposed via /api/initial */
  initialSaga?: Saga;
  /** verbose fastify logging */
  logger?: boolean;
  /** maximum jobs retained in memory */
  maxJobs?: number;
  /** completed-job retention window in milliseconds */
  jobRetentionMs?: number;
}

export interface StartedServer {
  app: FastifyInstance;
  port: number;
  host: string;
  url: string;
  jobs: JobStore;
  stop: () => Promise<void>;
}

export interface CreatedServerApp {
  app: FastifyInstance;
  jobs: JobStore;
}

export async function createServerApp(opts: ServerOptions = {}): Promise<CreatedServerApp> {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(cors, {
    origin: isAllowedLocalOrigin,
  });

  const jobs = new JobStore({
    maxJobs: opts.maxJobs,
    retentionMs: opts.jobRetentionMs,
  });
  if (opts.initialSaga) {
    jobs.seedCompleted('initial', opts.initialSaga.repo.source, opts.initialSaga, [
      { phase: 'done', message: 'Saga delivered from CLI', progress: 1 },
    ]);
  }
  await registerRoutes(app, { jobs, initialSaga: opts.initialSaga });

  const root = opts.webRoot ?? defaultWebRoot();
  if (root && fs.existsSync(root)) {
    await app.register(staticPlugin, {
      root,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    });
    // SPA fallback for non-API GETs
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET') {
        reply.code(404).send({ error: 'Not found' });
        return;
      }
      if (req.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not found' });
        return;
      }
      const indexPath = path.join(root, 'index.html');
      if (fs.existsSync(indexPath)) {
        reply.header('content-type', 'text/html; charset=utf-8');
        reply.send(fs.readFileSync(indexPath, 'utf8'));
        return;
      }
      reply.code(404).send({ error: 'index.html missing' });
    });
  } else {
    // No prebuilt UI present; show a friendly placeholder.
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not found' });
        return;
      }
      reply.header('content-type', 'text/html; charset=utf-8');
      reply.send(placeholderHtml());
    });
  }

  return { app, jobs };
}

export async function startServer(opts: ServerOptions = {}): Promise<StartedServer> {
  const port = opts.port ?? 0; // 0 = random
  const host = opts.host ?? '127.0.0.1';
  const { app, jobs } = await createServerApp(opts);

  const address = await app.listen({ port, host });
  const u = new URL(address);
  const resolvedPort = Number(u.port) || port;
  return {
    app,
    port: resolvedPort,
    host,
    url: address,
    jobs,
    stop: async () => {
      await app.close();
    },
  };
}

function defaultWebRoot(): string | undefined {
  const here = fileURLToPath(new URL('.', import.meta.url));
  // candidate locations in dev/prod
  const candidates = [
    path.resolve(here, '../../web/dist'),
    path.resolve(here, '../../../web/dist'),
    path.resolve(process.cwd(), 'packages/web/dist'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) return c;
  }
  return undefined;
}

function placeholderHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>repo-saga</title>
<style>
  body{font-family:system-ui,sans-serif;background:#efe2c1;color:#3a2a1a;padding:48px;line-height:1.6}
  code{background:#f5e8c8;padding:2px 6px;border-radius:4px;border:1px solid #c9b27d}
  h1{font-family:Georgia,serif}
</style></head>
<body>
  <h1>The Civilization of repo-saga</h1>
  <p>The web UI was not packaged with this build. The API is still available at <code>/api/health</code>.</p>
  <p>Build the UI by running <code>pnpm --filter @repo-saga/web build</code> in the workspace root.</p>
</body></html>`;
}

export { JobStore } from './jobs.js';
export type { Job, JobStatus } from './jobs.js';

export function isAllowedLocalOrigin(
  origin: string | undefined,
  cb: (err: Error | null, allow: boolean) => void,
) {
  if (!origin) {
    cb(null, true);
    return;
  }

  try {
    const url = new URL(origin);
    const allowed =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '::1' ||
        url.hostname === '[::1]');
    cb(null, allowed);
  } catch {
    cb(null, false);
  }
}

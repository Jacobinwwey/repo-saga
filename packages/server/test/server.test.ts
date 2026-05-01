import { describe, expect, it } from 'vitest';
import type { Saga } from '@repo-saga/core';
import { JobStore, createServerApp } from '../src/index.js';

const fixture: Saga = {
  schemaVersion: 1,
  repo: {
    name: 'demo',
    source: '/path/to/demo',
    resolvedPath: '/path/to/demo',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    commitCount: 1,
    firstCommitDate: '2024-01-01T00:00:00Z',
    lastCommitDate: '2024-01-01T00:00:00Z',
    contributors: 1,
    defaultBranch: 'main',
    tagCount: 0,
  },
  eras: [
    {
      id: 'era-1',
      name: 'Founding Era: A Chronicle Begins',
      startYear: 2024,
      endYear: 2024,
      theme: 'foundations',
      summary: '2024: 1 commits, 1 contributors, +1 / -0 lines.',
      summaryStats: { commits: 1, contributors: 1, insertions: 1, deletions: 0 },
      dominantEvents: [],
      evidence: ['Spanned 1 year(s) with 1 commits'],
    },
  ],
  events: [],
  stats: {
    commitsByYear: { '2024': 1 },
    insertionsByYear: { '2024': 1 },
    deletionsByYear: { '2024': 0 },
    contributorsByYear: { '2024': 1 },
    testRatioByYear: {},
    languagesByYear: { '2024': { ts: 1 } },
    topContributors: [{ name: 'Alice', email: 'alice@example.com', commits: 1 }],
  },
  meta: {
    generator: 'repo-saga',
    generatorVersion: '0.1.0',
    durationMs: 1,
    detectorsRun: [],
  },
};

describe('initial saga server routes', () => {
  it('seeds CLI-provided saga into the job artifact routes', async () => {
    const server = await createServerApp({ initialSaga: fixture });
    try {
      const initial = await server.app.inject({ method: 'GET', url: '/api/initial' });
      expect(initial.statusCode).toBe(200);
      expect(JSON.parse(initial.body).repo.name).toBe('demo');

      const jobJson = await server.app.inject({ method: 'GET', url: '/api/jobs/initial/saga.json' });
      expect(jobJson.statusCode).toBe(200);
      expect(JSON.parse(jobJson.body).repo.name).toBe('demo');

      const markdown = await server.app.inject({ method: 'GET', url: '/api/jobs/initial/saga.md' });
      expect(markdown.statusCode).toBe(200);
      expect(markdown.headers['content-type']).toContain('text/markdown');
      expect(markdown.body).toContain('The Civilization of demo');

      const svg = await server.app.inject({
        method: 'GET',
        url: '/api/jobs/initial/saga.svg?theme=epic',
      });
      expect(svg.statusCode).toBe(200);
      expect(svg.headers['content-type']).toContain('image/svg+xml');
      expect(svg.body).toContain('<svg');
    } finally {
      await server.app.close();
    }
  });
});

describe('server CORS defaults', () => {
  it('allows local browser origins and rejects unrelated origins', async () => {
    const server = await createServerApp();
    try {
      const local = await server.app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { origin: 'http://127.0.0.1:5173' },
      });
      expect(local.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');

      const remote = await server.app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { origin: 'https://evil.example' },
      });
      expect(remote.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await server.app.close();
    }
  });
});

describe('JobStore retention', () => {
  it('prunes oldest completed jobs over the configured max', () => {
    let now = Date.parse('2026-01-01T00:00:00Z');
    const jobs = new JobStore({ maxJobs: 2, retentionMs: Number.POSITIVE_INFINITY, now: () => now });

    jobs.seedCompleted('one', '/one', fixture);
    now += 1000;
    jobs.seedCompleted('two', '/two', fixture);
    now += 1000;
    jobs.seedCompleted('three', '/three', fixture);

    expect(jobs.get('one')).toBeUndefined();
    expect(jobs.get('two')).toBeDefined();
    expect(jobs.get('three')).toBeDefined();
    expect(jobs.list()).toHaveLength(2);
  });

  it('prunes completed jobs older than the configured retention window', () => {
    let now = Date.parse('2026-01-01T00:00:00Z');
    const jobs = new JobStore({ maxJobs: 10, retentionMs: 1000, now: () => now });

    jobs.seedCompleted('old', '/old', fixture);
    now += 2000;
    jobs.seedCompleted('fresh', '/fresh', fixture);

    expect(jobs.get('old')).toBeUndefined();
    expect(jobs.get('fresh')).toBeDefined();
  });
});

import { generateSaga } from '@repo-saga/core';
import type { ProgressEvent, Saga } from '@repo-saga/core';
import { randomUUID } from 'node:crypto';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface Job {
  id: string;
  source: string;
  status: JobStatus;
  startedAt: string;
  finishedAt?: string;
  events: ProgressEvent[];
  saga?: Saga;
  error?: string;
}

export type JobListener = (job: Job, event: ProgressEvent) => void;

export interface JobStoreOptions {
  /** Keep at most this many jobs in memory. Active jobs are never pruned. */
  maxJobs?: number;
  /** Drop completed jobs older than this many milliseconds. */
  retentionMs?: number;
  /** Test hook for deterministic pruning. */
  now?: () => number;
}

export class JobStore {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<JobListener>>();
  private maxJobs: number;
  private retentionMs: number;
  private now: () => number;

  constructor(opts: JobStoreOptions = {}) {
    this.maxJobs = opts.maxJobs ?? 100;
    this.retentionMs = opts.retentionMs ?? 30 * 60_000;
    this.now = opts.now ?? (() => Date.now());
  }

  start(source: string, opts: { maxCommits?: number; cacheDir?: string } = {}): Job {
    this.pruneCompleted();
    const id = randomUUID();
    const job: Job = {
      id,
      source,
      status: 'queued',
      startedAt: new Date().toISOString(),
      events: [],
    };
    this.jobs.set(id, job);
    // run async in background
    void this.runJob(job, opts);
    return job;
  }

  seedCompleted(id: string, source: string, saga: Saga, events: ProgressEvent[] = []): Job {
    const now = new Date(this.now()).toISOString();
    const job: Job = {
      id,
      source,
      status: 'done',
      startedAt: now,
      finishedAt: now,
      events,
      saga,
    };
    this.jobs.set(id, job);
    this.pruneCompleted();
    return job;
  }

  get(id: string): Job | undefined {
    this.pruneCompleted();
    return this.jobs.get(id);
  }

  list(): Job[] {
    this.pruneCompleted();
    return [...this.jobs.values()];
  }

  subscribe(id: string, listener: JobListener): () => void {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(id);
    };
  }

  private notify(job: Job, event: ProgressEvent) {
    const set = this.listeners.get(job.id);
    if (!set) return;
    for (const l of set) {
      try {
        l(job, event);
      } catch {
        // ignore listener errors
      }
    }
  }

  pruneCompleted() {
    const now = this.now();
    const completed = () =>
      [...this.jobs.values()]
        .filter((job) => job.status === 'done' || job.status === 'error')
        .sort((a, b) => Date.parse(a.finishedAt ?? a.startedAt) - Date.parse(b.finishedAt ?? b.startedAt));

    for (const job of completed()) {
      const finishedAt = Date.parse(job.finishedAt ?? job.startedAt);
      if (Number.isFinite(finishedAt) && now - finishedAt > this.retentionMs) {
        this.deleteJob(job.id);
      }
    }

    const remainingCompleted = completed();
    while (this.jobs.size > this.maxJobs && remainingCompleted.length > 0) {
      this.deleteJob(remainingCompleted.shift()!.id);
    }
  }

  private deleteJob(id: string) {
    this.jobs.delete(id);
    this.listeners.delete(id);
  }

  private async runJob(job: Job, opts: { maxCommits?: number; cacheDir?: string }) {
    job.status = 'running';
    const onProgress = (event: ProgressEvent) => {
      job.events.push(event);
      // keep events array bounded
      if (job.events.length > 200) job.events.splice(0, job.events.length - 200);
      this.notify(job, event);
    };
    try {
      const saga = await generateSaga(job.source, {
        maxCommits: opts.maxCommits,
        cacheDir: opts.cacheDir,
        onProgress,
      });
      job.saga = saga;
      job.status = 'done';
      job.finishedAt = new Date().toISOString();
      const finalEvent: ProgressEvent = { phase: 'done', message: 'Saga complete', progress: 1 };
      job.events.push(finalEvent);
      this.notify(job, finalEvent);
      this.pruneCompleted();
    } catch (err) {
      job.status = 'error';
      job.finishedAt = new Date().toISOString();
      job.error = err instanceof Error ? err.message : String(err);
      const errorEvent: ProgressEvent = {
        phase: 'error',
        message: job.error ?? 'Unknown error',
      };
      job.events.push(errorEvent);
      this.notify(job, errorEvent);
      this.pruneCompleted();
    }
  }
}

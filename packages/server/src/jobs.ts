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

export class JobStore {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<JobListener>>();

  start(source: string, opts: { maxCommits?: number; cacheDir?: string } = {}): Job {
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

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  list(): Job[] {
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
    }
  }
}

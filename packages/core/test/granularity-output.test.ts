import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateSaga } from '../src/index.js';

const tempDirs = new Set<string>();

afterEach(async () => {
  for (const dir of tempDirs) {
    try {
      await import('node:fs/promises').then(({ rm }) => rm(dir, { recursive: true, force: true }));
    } catch {
    }
  }
  tempDirs.clear();
});

describe('generateSaga quarterly output', () => {
  it('maps detector events onto the same quarterly timeline as eras', async () => {
    const repoDir = await createQuarterlyFixtureRepo();
    const saga = await generateSaga(repoDir, { timelineGranularity: 'quarter' });

    expect(saga.repo.timelineGranularity).toBe('quarter');
    expect(saga.eras.map((era) => era.displayStartLabel)).toEqual(['2024 Q1', '2024 Q2']);

    const eventfulEra = saga.eras.find((era) => era.dominantEvents.length > 0);
    expect(eventfulEra).toBeDefined();

    const eventsInEra = saga.events.filter(
      (event) => event.endYear >= eventfulEra!.startYear && event.startYear <= eventfulEra!.endYear,
    );
    expect(eventsInEra.length).toBeGreaterThan(0);
    expect(eventsInEra[0]?.displayStartLabel).toBe('2024 Q1');
    expect(eventsInEra[0]?.displayEndLabel).toBe('2024 Q1');
  });
});

async function createQuarterlyFixtureRepo(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repo-saga-quarterly-'));
  tempDirs.add(root);

  runGit(['init'], root);
  runGit(['checkout', '-b', 'main'], root);
  runGit(['config', 'user.name', 'Repo Saga Test'], root);
  runGit(['config', 'user.email', 'repo-saga@example.com'], root);

  await commitFile(root, 'README.md', '# demo\n', '2024-01-01T10:00:00Z', 'docs: found the repo');
  await commitFile(root, 'src/alpha.js', 'export const alpha = 1;\n', '2024-01-08T10:00:00Z', 'feat: add alpha');
  await commitFile(root, 'src/beta.js', 'export const beta = 2;\n', '2024-01-15T10:00:00Z', 'feat: add beta');
  await commitFile(root, 'src/gamma.js', 'export const gamma = 3;\n', '2024-02-01T10:00:00Z', 'feat: add gamma');
  await commitFile(root, 'src/delta.js', 'export const delta = 4;\n', '2024-02-20T10:00:00Z', 'feat: add delta');
  await commitFile(root, 'src/epsilon.js', 'export const epsilon = 5;\n', '2024-04-10T10:00:00Z', 'feat: add epsilon');

  const log = await readFile(path.join(root, '.git', 'logs', 'HEAD'), 'utf8');
  expect(log).toContain('feat: add epsilon');

  return root;
}

async function commitFile(
  repoDir: string,
  relativePath: string,
  content: string,
  isoDate: string,
  subject: string,
) {
  const absolutePath = path.join(repoDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  runGit(['add', relativePath], repoDir);
  runGit(['commit', '-m', subject], repoDir, {
    GIT_AUTHOR_DATE: isoDate,
    GIT_COMMITTER_DATE: isoDate,
  });
}

function runGit(args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  execFileSync('git', args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

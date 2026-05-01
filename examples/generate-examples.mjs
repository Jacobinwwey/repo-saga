// Run from the workspace root after `pnpm build` to regenerate
// examples/sample-saga.{md,svg} from sample-saga.json.
//
//   node examples/generate-examples.mjs

import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { renderMarkdown, renderSvg } = await import('../packages/renderer/dist/index.js');

  const jsonPath = path.join(here, 'sample-saga.json');
  const saga = JSON.parse(await readFile(jsonPath, 'utf8'));

  const enMd = renderMarkdown(saga, { lang: 'en' });
  const enSvg = renderSvg(saga, { theme: 'epic', lang: 'en' });
  const zhMd = renderMarkdown(saga, { lang: 'zh' });
  const zhSvg = renderSvg(saga, { theme: 'epic', lang: 'zh' });

  await writeFile(path.join(here, 'sample-saga.md'), enMd, 'utf8');
  await writeFile(path.join(here, 'sample-saga.svg'), enSvg, 'utf8');
  await writeFile(path.join(here, 'sample-saga.zh.md'), zhMd, 'utf8');
  await writeFile(path.join(here, 'sample-saga.zh.svg'), zhSvg, 'utf8');
  console.log(
    'Wrote examples/sample-saga.{md,svg} and examples/sample-saga.zh.{md,svg}',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

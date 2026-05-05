import type { DetectedEvent, Era, Saga } from '@repo-saga/core';
import {
  composeEraSummary,
  label,
  translateEra,
  translateEventNarrative,
  translateEventTitle,
  translateEvidence,
  translateSeverity,
  type Lang,
} from './i18n.js';

export interface MarkdownOptions {
  /** include the JSON-style stats section at the bottom */
  includeStats?: boolean;
  /** rendering language (default: en) */
  lang?: Lang;
}

export function renderMarkdown(saga: Saga, opts: MarkdownOptions = {}): string {
  const includeStats = opts.includeStats ?? true;
  const lang: Lang = opts.lang ?? 'en';
  const lines: string[] = [];

  lines.push(`# ${label(lang, 'civilizationOf', { name: escape(saga.repo.name) })}`);
  lines.push('');
  lines.push(_subtitle(saga, lang));
  lines.push('');

  if (saga.eras.length === 0) {
    lines.push(label(lang, 'chronicleEmpty'));
    return lines.join('\n');
  }

  for (const era of saga.eras) {
    const localized = translateEra(era, saga.events, lang);
    lines.push(`## ${escape(localized.name)}, ${era.startYear}–${era.endYear}`);
    lines.push('');
    lines.push(`> _${escape(localized.theme)}_`);
    lines.push('');
    lines.push(escape(composeEraSummary(era, saga.events, lang)));
    lines.push('');
    if (era.evidence.length > 0) {
      lines.push(label(lang, 'evidenceHeading'));
      lines.push('');
      for (const ev of era.evidence) lines.push(`- ${escape(translateEvidence(ev, lang))}`);
      lines.push('');
    }
    const inEra = saga.events.filter((ev) => isEventInEra(ev, era));
    if (inEra.length > 0) {
      lines.push(label(lang, 'eventsHeading'));
      lines.push('');
      for (const ev of inEra) {
        const title = translateEventTitle(ev.type, lang);
        const narrative = translateEventNarrative(ev.type, lang);
        lines.push(`### ${escape(title)} (${formatRange(ev)})`);
        lines.push('');
        lines.push(`_${escape(narrative)}_`);
        lines.push('');
        if (ev.evidence.length > 0) {
          lines.push(label(lang, 'evidence'));
          for (const e of ev.evidence) lines.push(`- ${escape(translateEvidence(e, lang))}`);
          lines.push('');
        }
        lines.push(
          label(lang, 'severityLine', {
            severity: translateSeverity(ev.severity, lang),
            pct: (ev.confidence * 100).toFixed(0),
          }),
        );
        lines.push('');
      }
    }
  }

  if (includeStats) {
    lines.push('---');
    lines.push('');
    lines.push(label(lang, 'footnotesHeading'));
    lines.push('');
    lines.push(label(lang, 'footnoteSource', { value: escape(saga.repo.source) }));
    lines.push(label(lang, 'footnoteAnalyzed', { value: escape(saga.repo.analyzedAt) }));
    lines.push(label(lang, 'footnoteCommits', { value: saga.repo.commitCount.toLocaleString() }));
    lines.push(label(lang, 'footnoteContributors', { value: saga.repo.contributors }));
    lines.push(label(lang, 'footnoteFirstCommit', { value: escape(saga.repo.firstCommitDate) }));
    lines.push(label(lang, 'footnoteLastCommit', { value: escape(saga.repo.lastCommitDate) }));
    lines.push(
      label(lang, 'footnoteDefaultBranch', {
        value: escape(saga.repo.defaultBranch ?? label(lang, 'unknown')),
      }),
    );
    lines.push(label(lang, 'footnoteTags', { value: saga.repo.tagCount }));
    lines.push('');
    if (saga.stats.topContributors.length > 0) {
      lines.push(label(lang, 'topContribsHeading'));
      lines.push('');
      lines.push(label(lang, 'tableHeader'));
      lines.push(label(lang, 'tableDivider'));
      for (const c of saga.stats.topContributors) {
        lines.push(`| ${escape(c.name || c.email)} | ${c.commits.toLocaleString()} |`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
    lines.push(
      label(lang, 'generatedBy', {
        generator: saga.meta.generator,
        version: saga.meta.generatorVersion,
        ms: saga.meta.durationMs.toLocaleString(),
      }),
    );
  }

  return lines.join('\n');
}

function isEventInEra(event: DetectedEvent, era: Era): boolean {
  return event.endYear >= era.startYear && event.startYear <= era.endYear;
}

function _subtitle(saga: Saga, lang: Lang): string {
  const period = `${shortYear(saga.repo.firstCommitDate)}–${shortYear(saga.repo.lastCommitDate)}`;
  return label(lang, 'chronicleSubtitle', {
    period,
    commits: saga.repo.commitCount.toLocaleString(),
    contributors: saga.repo.contributors,
    tags: saga.repo.tagCount,
  });
}

function shortYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 4);
  return String(d.getUTCFullYear());
}

function formatRange(event: DetectedEvent): string {
  if (event.startYear === event.endYear) return String(event.startYear);
  return `${event.startYear}–${event.endYear}`;
}

function escape(s: string): string {
  return String(s ?? '').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'));
}

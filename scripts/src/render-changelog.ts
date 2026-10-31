// Render a package's CHANGELOG.md from the parsed lines of its changes.jsonl.

const DEFAULT_REPO = 'shellicar/ecosystem';

export type Entry = { type?: 'change'; description: string; category: string; metadata?: Record<string, unknown> };
export type ReleaseMarker = { type: 'release'; version: string; date: string; tag?: string; repo?: string; description?: string };
type Group = { entries: Entry[]; release: ReleaseMarker };

const PREAMBLE = ['', '', 'All notable changes to this project will be documented in this file.', '', 'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),', 'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).'].join('\n');

export function renderChangelog(lines: (Entry | ReleaseMarker)[], shortName: string, categories: Record<string, string>): string {
  const categoryOrder = Object.keys(categories);

  const groups: Group[] = [];
  let pending: Entry[] = [];

  for (const obj of lines) {
    if (obj.type === 'release') {
      groups.push({ entries: pending, release: obj });
      pending = [];
    } else {
      pending.push(obj);
    }
  }
  const unreleased = pending;

  // A release links to the repository it was published from: `repo` when set, otherwise this one.
  function tagUrl(release: ReleaseMarker): string {
    const tag = release.tag ?? `${shortName}@${release.version}`;
    const repo = release.repo ?? DEFAULT_REPO;
    return `https://github.com/${repo}/releases/tag/${tag}`;
  }

  function renderLine(entry: Entry): string {
    let text = entry.description;
    if (entry.metadata?.issue != null) {
      text += ` (#${entry.metadata.issue})`;
    }
    if (typeof entry.metadata?.ghsa === 'string') {
      const ghsa = entry.metadata.ghsa;
      text += ` ([${ghsa}](https://github.com/advisories/${ghsa}))`;
    }
    return `- ${text}`;
  }

  // Within a category, entries are ordered by description, ignoring case. Comparing code points
  // keeps the order the same in every locale.
  function byDescription(a: Entry, b: Entry): number {
    const da = a.description.toLowerCase();
    const db = b.description.toLowerCase();
    return da < db ? -1 : da > db ? 1 : 0;
  }

  function renderEntries(entries: Entry[]): string {
    const byCategory: Record<string, Entry[]> = {};
    for (const entry of entries) {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry);
    }
    return categoryOrder
      .filter((k) => byCategory[k]?.length)
      .map((k) => `### ${categories[k]}\n\n${[...byCategory[k]].sort(byDescription).map(renderLine).join('\n')}`)
      .join('\n\n');
  }

  const parts: string[] = [`# Changelog${PREAMBLE}`];

  if (unreleased.length > 0) {
    parts.push('\n## [Unreleased]');
    parts.push(`\n${renderEntries(unreleased)}`);
  }

  for (const { entries, release } of [...groups].reverse()) {
    parts.push(`\n## [${release.version}] - ${release.date}`);
    // The release-wide story, above the categorised lines.
    if (release.description != null) {
      parts.push(`\n${release.description}`);
    }
    if (entries.length > 0) {
      parts.push(`\n${renderEntries(entries)}`);
    }
  }

  if (groups.length > 0) {
    parts.push(
      `\n${[...groups]
        .reverse()
        .map((g) => `[${g.release.version}]: ${tagUrl(g.release)}`)
        .join('\n')}`,
    );
  }

  return `${parts.join('\n')}\n`;
}

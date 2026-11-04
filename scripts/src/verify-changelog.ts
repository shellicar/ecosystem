import semver from 'semver';

// Check a package's CHANGELOG.md against the version being published.
//
// Every `## [...]` heading other than `## [Unreleased]` is a version heading, and its version must
// be valid semver. The first version heading must be the version being published, with a date.
// A stable publish fails while a pre-release heading remains below it, down to the previous stable
// heading, or to the bottom when there is none.

export type VerifyResult = { ok: true } | { ok: false; message: string };

type Heading = { version: string; rest: string };

const HEADING = /^## \[([^\]]*)\](.*)$/;
const DATED = /^ - \d{4}-\d{2}-\d{2}$/;

// A version written exactly as Semantic Versioning writes one. semver.parse also accepts a
// leading `v` and surrounding spaces, which the comparison with the original rejects.
function isSemver(version: string): boolean {
  const parsed = semver.parse(version);
  if (parsed == null) {
    return false;
  }
  const written = parsed.build.length > 0 ? `${parsed.version}+${parsed.build.join('.')}` : parsed.version;
  return written === version;
}

function isPrerelease(version: string): boolean {
  return semver.prerelease(version) != null;
}

function versionHeadings(changelog: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of changelog.split(/\r?\n/)) {
    const match = HEADING.exec(line);
    if (match != null && match[1] !== 'Unreleased') {
      headings.push({ version: match[1], rest: match[2] });
    }
  }
  return headings;
}

export function verifyChangelog(changelog: string, version: string): VerifyResult {
  const headings = versionHeadings(changelog);
  const [first, ...below] = headings;

  if (first == null) {
    return { ok: false, message: `No version heading (expected: ## [${version}] - YYYY-MM-DD)` };
  }

  const invalid = headings.find((heading) => !isSemver(heading.version));
  if (invalid != null) {
    return { ok: false, message: `Version heading [${invalid.version}] is not a valid semver version` };
  }

  if (first.version !== version) {
    return { ok: false, message: `First version heading [${first.version}] does not match release version [${version}]` };
  }
  if (!DATED.test(first.rest)) {
    return { ok: false, message: `Entry ## [${version}] is missing a date (expected: ## [${version}] - YYYY-MM-DD)` };
  }

  // Headings run newest first, so any pre-release left between a stable release and the previous
  // stable one includes the heading straight below it.
  const next = below[0];
  if (!isPrerelease(version) && next != null && isPrerelease(next.version)) {
    return { ok: false, message: `Pre-release heading [${next.version}] remains below [${version}]: remove its release marker so its entries fall under [${version}]` };
  }

  return { ok: true };
}

import { describe, expect, it } from 'vitest';
import { type Entry, type ReleaseMarker, renderChangelog } from '../src/render-changelog.js';
import { verifyChangelog } from '../src/verify-changelog.js';

const categories = { added: 'Added', changed: 'Changed', fixed: 'Fixed' };

const entry = (description: string): Entry => ({ description, category: 'fixed' });
const release = (shortName: string, version: string, date = '2026-11-03'): ReleaseMarker => ({ type: 'release', version, date, tag: `${shortName}@${version}` });

function verify(shortName: string, lines: (Entry | ReleaseMarker)[], version: string) {
  return verifyChangelog(renderChangelog(lines, shortName, categories), version);
}

// Shaped like build-clean: a package with stable releases.
const buildClean: (Entry | ReleaseMarker)[] = [entry('Initial release'), release('build-clean', '1.3.0'), entry('Refuse to clean what cannot be identified'), release('build-clean', '1.4.0')];

// Shaped like core-di-engine: a package published only as pre-releases so far.
const coreDiEngine: (Entry | ReleaseMarker)[] = [entry('Initial release'), release('core-di-engine', '5.0.0-alpha.1'), entry('Export `IForwardResult` as a value'), release('core-di-engine', '5.0.0-alpha.2')];

describe('verifyChangelog for a pre-release publish', () => {
  it('passes when the first version heading matches', () => {
    const expected = { ok: true };

    const actual = verify('core-di-engine', coreDiEngine, '5.0.0-alpha.2');

    expect(actual).toEqual(expected);
  });

  it('passes with unreleased entries above the matching heading', () => {
    const expected = { ok: true };

    const actual = verify('core-di-engine', [...coreDiEngine, entry('Not released yet')], '5.0.0-alpha.2');

    expect(actual).toEqual(expected);
  });

  it('fails when the first version heading does not match', () => {
    const expected = { ok: false, message: expect.stringContaining('[5.0.0-alpha.2] does not match release version [5.0.0-alpha.3]') };

    const actual = verify('core-di-engine', coreDiEngine, '5.0.0-alpha.3');

    expect(actual).toEqual(expected);
  });

  it('fails when the version being published only starts the first version heading', () => {
    const expected = { ok: false, message: expect.stringContaining('[5.0.0-alpha.10] does not match release version [5.0.0-alpha.1]') };

    const actual = verify('core-di-engine', [...coreDiEngine, entry('Later'), release('core-di-engine', '5.0.0-alpha.10')], '5.0.0-alpha.1');

    expect(actual).toEqual(expected);
  });
});

describe('verifyChangelog for a stable publish of a package with stable releases', () => {
  it('passes once its pre-release headings are removed', () => {
    const expected = { ok: true };

    const actual = verify('build-clean', [...buildClean, entry('From the alpha'), entry('After the alpha'), release('build-clean', '1.4.1')], '1.4.1');

    expect(actual).toEqual(expected);
  });

  it('fails with a pre-release heading left in place', () => {
    const expected = { ok: false, message: expect.stringContaining('Pre-release heading [1.4.1-alpha.1] remains below [1.4.1]') };

    const actual = verify('build-clean', [...buildClean, entry('From the alpha'), release('build-clean', '1.4.1-alpha.1'), entry('After the alpha'), release('build-clean', '1.4.1')], '1.4.1');

    expect(actual).toEqual(expected);
  });

  it('passes with a pre-release heading below the previous stable heading', () => {
    const expected = { ok: true };

    const actual = verify('build-clean', [entry('Initial release'), release('build-clean', '1.4.0-alpha.1'), entry('Stable'), release('build-clean', '1.4.0'), entry('Next'), release('build-clean', '1.4.1')], '1.4.1');

    expect(actual).toEqual(expected);
  });
});

describe('verifyChangelog for a stable publish of a package without stable releases', () => {
  it('passes once its pre-release headings are removed', () => {
    const expected = { ok: true };

    const actual = verify('core-di-engine', [entry('Initial release'), entry('Export `IForwardResult` as a value'), release('core-di-engine', '5.0.0')], '5.0.0');

    expect(actual).toEqual(expected);
  });

  it('fails with a pre-release heading left in place', () => {
    const expected = { ok: false, message: expect.stringContaining('Pre-release heading [5.0.0-alpha.2] remains below [5.0.0]') };

    const actual = verify('core-di-engine', [...coreDiEngine, release('core-di-engine', '5.0.0')], '5.0.0');

    expect(actual).toEqual(expected);
  });
});

describe('verifyChangelog with build metadata', () => {
  it('treats a version being published with build metadata as stable', () => {
    const expected = { ok: false, message: expect.stringContaining('Pre-release heading [1.0.0-alpha.1] remains below [1.0.0+build-5]') };

    const actual = verify('example', [entry('Alpha'), release('example', '1.0.0-alpha.1'), entry('Stable'), release('example', '1.0.0+build-5')], '1.0.0+build-5');

    expect(actual).toEqual(expected);
  });

  it('treats a version heading with build metadata as stable', () => {
    const expected = { ok: true };

    const actual = verify('example', [entry('Alpha'), release('example', '1.0.0-alpha.1'), entry('Stable'), release('example', '1.0.0+build-5'), entry('Next'), release('example', '1.1.0')], '1.1.0');

    expect(actual).toEqual(expected);
  });
});

describe('verifyChangelog headings', () => {
  it('fails a version heading that is not valid semver', () => {
    const expected = { ok: false, message: expect.stringContaining('Version heading [1.0] is not a valid semver version') };

    const actual = verify('example', [entry('Old'), release('example', '1.0'), entry('New'), release('example', '1.1.0')], '1.1.0');

    expect(actual).toEqual(expected);
  });

  it('fails a version heading with a leading v', () => {
    const expected = { ok: false, message: expect.stringContaining('Version heading [v1.0.0] is not a valid semver version') };

    const actual = verify('example', [entry('Old'), release('example', 'v1.0.0'), entry('New'), release('example', '1.1.0')], '1.1.0');

    expect(actual).toEqual(expected);
  });

  it('fails when there is no version heading', () => {
    const expected = { ok: false, message: expect.stringContaining('No version heading') };

    const actual = verify('example', [entry('Not released yet')], '1.0.0');

    expect(actual).toEqual(expected);
  });

  it('fails when the first version heading has no date', () => {
    const expected = { ok: false, message: expect.stringContaining('Entry ## [1.1.0] is missing a date') };

    const actual = verify('example', [entry('Old'), release('example', '1.0.0'), entry('New'), release('example', '1.1.0', 'soon')], '1.1.0');

    expect(actual).toEqual(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { type Entry, type ReleaseMarker, renderChangelog } from '../src/render-changelog.js';

const categories = { added: 'Added', changed: 'Changed' };

describe('renderChangelog release links', () => {
  it('a release with repo links to that repository', () => {
    const expected = '[3.1.6]: https://github.com/shellicar/core-di/releases/tag/3.1.6';

    const actual = renderChangelog(
      [
        { description: 'Initial release', category: 'added' },
        { type: 'release', version: '3.1.6', date: '2026-02-28', tag: '3.1.6', repo: 'shellicar/core-di' },
      ],
      'core-di',
      categories,
    ).split('\n');

    expect(actual).toContain(expected);
  });

  it('a release without repo links to this repository', () => {
    const expected = '[4.0.0]: https://github.com/shellicar/ecosystem/releases/tag/core-di@4.0.0';

    const actual = renderChangelog(
      [
        { description: 'Initial release', category: 'added' },
        { type: 'release', version: '4.0.0', date: '2026-04-15', tag: 'core-di@4.0.0' },
      ],
      'core-di',
      categories,
    ).split('\n');

    expect(actual).toContain(expected);
  });
});

describe('renderChangelog unreleased', () => {
  it('a package with nothing unreleased renders an empty Unreleased section', () => {
    const expected = '## [Unreleased]\n\n## [4.0.0] - 2026-04-15';

    const actual = renderChangelog(
      [
        { description: 'Initial release', category: 'added' },
        { type: 'release', version: '4.0.0', date: '2026-04-15', tag: 'core-di@4.0.0' },
      ],
      'core-di',
      categories,
    );

    expect(actual).toContain(expected);
  });
});

describe('renderChangelog pre-releases', () => {
  const lines: (Entry | ReleaseMarker)[] = [
    { description: 'Initial release', category: 'added' },
    { type: 'release', version: '4.0.0', date: '2026-04-15', tag: 'core-di@4.0.0' },
    { description: 'Rebuild the container on the shared engine', category: 'changed' },
    { type: 'release', version: '5.0.0-alpha.1', date: '2026-07-19', tag: 'core-di@5.0.0-alpha.1' },
  ];

  it('a pre-release marker renders its own section', () => {
    const expected = '## [5.0.0-alpha.1] - 2026-07-19\n\n### Changed\n\n- Rebuild the container on the shared engine\n\n## [4.0.0] - 2026-04-15';

    const actual = renderChangelog(lines, 'core-di', categories);

    expect(actual).toContain(expected);
  });

  it('a pre-release marker links to its release', () => {
    const expected = '[5.0.0-alpha.1]: https://github.com/shellicar/ecosystem/releases/tag/core-di@5.0.0-alpha.1';

    const actual = renderChangelog(lines, 'core-di', categories).split('\n');

    expect(actual).toContain(expected);
  });
});

describe('renderChangelog advisories', () => {
  const security = { security: 'Security' };
  const release: ReleaseMarker = { type: 'release', version: '2.0.1', date: '2026-11-11', tag: 'build-version@2.0.1' };

  it('an entry with one advisory id links it', () => {
    const expected = '- Uses glob 14 ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4))';

    const actual = renderChangelog([{ description: 'Uses glob 14', category: 'security', metadata: { ghsa: 'GHSA-3g3m-2fjr-6pw4' } }, release], 'build-version', security).split('\n');

    expect(actual).toContain(expected);
  });

  it('an entry with a list of advisory ids links each one', () => {
    const expected = '- Works with Nuxt 4.6 ([GHSA-vjh5-4x84-xrqp](https://github.com/advisories/GHSA-vjh5-4x84-xrqp), [GHSA-jjm6-p2m9-9w4x](https://github.com/advisories/GHSA-jjm6-p2m9-9w4x))';

    const actual = renderChangelog([{ description: 'Works with Nuxt 4.6', category: 'security', metadata: { ghsa: ['GHSA-vjh5-4x84-xrqp', 'GHSA-jjm6-p2m9-9w4x'] } }, release], 'build-version', security).split('\n');

    expect(actual).toContain(expected);
  });

  it('an entry with an empty list renders no advisory link', () => {
    const expected = '- Works with Nuxt 4.6';

    const actual = renderChangelog([{ description: 'Works with Nuxt 4.6', category: 'security', metadata: { ghsa: [] } }, release], 'build-version', security).split('\n');

    expect(actual).toContain(expected);
  });

  it('an entry with a non-string id links only the advisory ids', () => {
    const expected = '- Works with Nuxt 4.6 ([GHSA-vjh5-4x84-xrqp](https://github.com/advisories/GHSA-vjh5-4x84-xrqp))';

    const actual = renderChangelog([{ description: 'Works with Nuxt 4.6', category: 'security', metadata: { ghsa: ['GHSA-vjh5-4x84-xrqp', 5] } }, release], 'build-version', security).split('\n');

    expect(actual).toContain(expected);
  });
});

describe('renderChangelog entry order', () => {
  const entries: Entry[] = [
    { description: 'construct eagerly with `.eager()`', category: 'added' },
    { description: 'Dispose per lifetime', category: 'added' },
    { description: 'Build asynchronously with `usingAsync`', category: 'added' },
  ];
  const release: ReleaseMarker = { type: 'release', version: '5.0.0', date: '2026-07-19', tag: 'core-di@5.0.0' };

  it('entries in one category render in the same order whatever the order of their lines', () => {
    const expected = renderChangelog([...entries, release], 'core-di', categories);

    const actual = renderChangelog([...[...entries].reverse(), release], 'core-di', categories);

    expect(actual).toBe(expected);
  });

  it('entries in one category are sorted by description, ignoring case', () => {
    const expected = '### Added\n\n- Build asynchronously with `usingAsync`\n- construct eagerly with `.eager()`\n- Dispose per lifetime';

    const actual = renderChangelog([...entries, release], 'core-di', categories);

    expect(actual).toContain(expected);
  });
});

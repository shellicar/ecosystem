import { describe, expect, it } from 'vitest';
import { renderChangelog } from '../src/render-changelog.js';

const categories = { added: 'Added' };

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

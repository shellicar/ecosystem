import { describe, expect, it } from 'vitest';
import { getPullRequestNumber } from '../../src/core/git';

describe('git', () => {
  describe('getPullRequestNumber', () => {
    it('extracts PR number from pull/123 branch', () => {
      const actual = getPullRequestNumber('pull/123');
      const expected = '0123';

      expect(actual).toBe(expected);
    });

    it('extracts PR number from pull-requests/456 branch', () => {
      const actual = getPullRequestNumber('pull-requests/456');
      const expected = '0456';

      expect(actual).toBe(expected);
    });

    it('extracts PR number from pull-789 branch', () => {
      const actual = getPullRequestNumber('pull-789');
      const expected = '0789';

      expect(actual).toBe(expected);
    });

    it('extracts PR number from pr/012 branch', () => {
      const actual = getPullRequestNumber('pr/012');
      const expected = '0012';

      expect(actual).toBe(expected);
    });

    it('extracts PR number from pr-345 branch', () => {
      const actual = getPullRequestNumber('pr-345');
      const expected = '0345';

      expect(actual).toBe(expected);
    });

    it('extracts PR number from pull-requests-678 branch', () => {
      const actual = getPullRequestNumber('pull-requests-678');
      const expected = '0678';

      expect(actual).toBe(expected);
    });
  });
});

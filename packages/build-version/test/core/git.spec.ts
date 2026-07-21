import { describe, expect, it } from 'vitest';
import { buildTagMatchPattern, createGitStrategy, type ExecCommand, getPullRequestNumber, parseTag } from '../../src/core/git';
import type { ILogger } from '../../src/core/types';

const createFakeLogger = (): ILogger => ({
  debug: () => {},
  error: () => {},
});

const createFakeExec = (responses: Record<string, string | null>): ExecCommand => {
  return (command: string) => (command in responses ? responses[command] : null);
};

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

  describe('buildTagMatchPattern', () => {
    it('matches every tag when no package name is given', () => {
      const actual = buildTagMatchPattern();
      const expected = '*';

      expect(actual).toBe(expected);
    });

    it('scopes the pattern to the package name', () => {
      const actual = buildTagMatchPattern('pkg-a');
      const expected = 'pkg-a@*';

      expect(actual).toBe(expected);
    });
  });

  describe('parseTag', () => {
    it('parses a bare semver tag', () => {
      const actual = parseTag('1.2.3');
      const expected = { major: 1, minor: 2, patch: 3, prerelease: null };

      expect(actual).toEqual(expected);
    });

    it('parses the pre-release label off a tag', () => {
      const actual = parseTag('1.0.0-beta.22');
      const expected = { major: 1, minor: 0, patch: 0, prerelease: 'beta.22' };

      expect(actual).toEqual(expected);
    });

    it('strips the package name prefix before parsing', () => {
      const actual = parseTag('pkg-a@1.0.0-beta.22', 'pkg-a');
      const expected = { major: 1, minor: 0, patch: 0, prerelease: 'beta.22' };

      expect(actual).toEqual(expected);
    });

    it('declines to parse a tag that is not semver', () => {
      const actual = parseTag('not-a-version');

      expect(actual).toBeNull();
    });

    it("declines to parse another package's tag when no packageName is given to strip it", () => {
      const actual = parseTag('core-di-engine@5.0.0-alpha.1');

      expect(actual).toBeNull();
    });
  });

  describe('createGitStrategy', () => {
    it('reports the exact tag on main when HEAD is the tagged commit', () => {
      const exec = createFakeExec({
        'git branch --show-current': 'main',
        "git describe --tags --long --match 'pkg-a@*'": 'pkg-a@1.0.0-beta.22-0-gabc1234',
      });
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-a' }, exec);

      const actual = calculator()?.version;
      const expected = '1.0.0-beta.22';

      expect(actual).toBe(expected);
    });

    it('keeps counting from the last tag on main instead of resetting when HEAD has moved past it', () => {
      const exec = createFakeExec({
        'git branch --show-current': 'main',
        "git describe --tags --long --match 'pkg-a@*'": 'pkg-a@1.0.0-beta.22-3-gabc1234',
      });
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-a' }, exec);

      const actual = calculator()?.version;
      const expected = '1.0.0-beta.22.3';

      expect(actual).toBe(expected);
    });

    it('selects the tag matching this package out of several on the same commit', () => {
      const exec = createFakeExec({
        'git branch --show-current': 'main',
        "git describe --tags --long --match 'pkg-b@*'": 'pkg-b@2.1.0-0-gabc1234',
      });
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-b' }, exec);

      const actual = calculator()?.version;
      const expected = '2.1.0';

      expect(actual).toBe(expected);
    });

    it('labels a PR branch with its PR number', () => {
      const exec = createFakeExec({
        'git branch --show-current': 'pull/472',
        "git describe --tags --long --match 'pkg-a@*'": 'pkg-a@1.0.0-beta.22-5-gabc1234',
      });
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-a' }, exec);

      const actual = calculator()?.version;
      const expected = '1.0.0-PullRequest-0472.5';

      expect(actual).toBe(expected);
    });

    it('sanitizes a non-PR branch name', () => {
      const exec = createFakeExec({
        'git branch --show-current': 'feature/git-tool',
        "git describe --tags --long --match 'pkg-a@*'": 'pkg-a@1.0.0-beta.22-2-gabc1234',
      });
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-a' }, exec);

      const actual = calculator()?.version;
      const expected = '1.0.0-feature-git-tool.2';

      expect(actual).toBe(expected);
    });

    it('declines when there is no matching tag at all', () => {
      const exec = createFakeExec({
        'git branch --show-current': 'main',
      });
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-a' }, exec);

      const actual = calculator();

      expect(actual).toBeNull();
    });

    it("declines rather than fabricate a version when git describe matches an unrelated package's tag", () => {
      const exec = createFakeExec({
        'git branch --show-current': 'main',
        "git describe --tags --long --match '*'": 'core-di-engine@5.0.0-alpha.1-9-gabc1234',
      });
      const calculator = createGitStrategy(createFakeLogger(), {}, exec);

      const actual = calculator();

      expect(actual).toBeNull();
    });

    it('declines when there is no git working tree at all', () => {
      const exec = createFakeExec({});
      const calculator = createGitStrategy(createFakeLogger(), { packageName: 'pkg-a' }, exec);

      const actual = calculator();

      expect(actual).toBeNull();
    });
  });
});

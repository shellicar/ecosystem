# Migration Guide: v1.x → v2.x

This guide helps you migrate from v1.x to v2.x of `@shellicar/build-version`.

## Overview

v2.x replaces the single `versionCalculator` option with an ordered `strategies`
list built from `Strategies` factories. This is the core breaking change:

- **`versionCalculator: 'git' | 'gitversion' | (() => VersionInfo)`** is gone.
  Replaced by **`strategies: VersionStrategyDescriptor[]`**, an ordered list where
  the first strategy to produce a result wins, no configuration needed for the
  common cases, since a default list is used when `strategies` is omitted.
- **New `packageName` option** on the git strategy: scopes tag matching to
  `<packageName>@*`, so the right tag is picked out of several packages' tags
  that can share a commit in a monorepo.
- **The git strategy now preserves a tag's pre-release label on `main`.** A tag
  like `1.0.0-beta.22` used to become `1.0.1` (patch bumped, label discarded) once
  `main` moved past it; it now stays `1.0.0-beta.22.1`.

Most users will replace one `versionCalculator` line with one `strategies` line.
There is no partial-migration path: `versionCalculator` no longer exists as an option.

## Details

### `versionCalculator` → `strategies`

| v1 | v2 |
| --- | --- |
| *(omitted, default)* | *(omitted, default)*, same behaviour, now expressed as `[Strategies.envOverride(), Strategies.gitversion(), Strategies.git(), Strategies.fallback('0.1.0')]` |
| `versionCalculator: 'git'` | `strategies: [Strategies.git()]` |
| `versionCalculator: 'gitversion'` | `strategies: [Strategies.gitversion()]` |
| `versionCalculator: () => ({ version: '1.0.0-custom', branch: 'main' })` | `strategies: [Strategies.custom(() => ({ version: '1.0.0-custom', branch: 'main' }))]` |

### New: `packageName`

If you build several packages from one monorepo and they can share a tagged
commit, pass `packageName` so the git strategy matches only that package's own
tags (`<packageName>@*`) instead of whichever tag `git describe` happens to pick:

```ts
VersionPlugin({
  strategies: [Strategies.git({ packageName: 'my-package' })],
})
```

### Changed: pre-release labels on `main` are preserved

If your tags carry a pre-release label (e.g. `1.0.0-beta.22`) and `main` has
commits past that tag, the version used to drop the label entirely:

- v1: `1.0.0-beta.22` (tagged) → `1.0.1` (1 commit later)
- v2: `1.0.0-beta.22` (tagged) → `1.0.0-beta.22.1` (1 commit later)

If your tags are plain (`1.0.0`, no pre-release), nothing changes: `main` still
counts commits the same way, just via the label-aware format instead of a numeric
patch bump: v1's `1.0.1` becomes v2's `1.0.0.1` for the case with no pre-release
label at all. Check any code that parses the version string's shape rather than
just reading it as an opaque semver.

## Guide

### Step 1: Update the package

```bash
pnpm add @shellicar/build-version@^2
```

### Step 2: Replace `versionCalculator` with `strategies`

Find every `versionCalculator` option and replace it using the table above. Import
`Strategies` alongside the plugin:

```ts
// Before
import VersionPlugin from '@shellicar/build-version/vite';

VersionPlugin({
  versionCalculator: 'git',
});
```

```ts
// After
import VersionPlugin from '@shellicar/build-version/vite';
import { Strategies } from '@shellicar/build-version/types';

VersionPlugin({
  strategies: [Strategies.git()],
});
```

### Step 3: Add `packageName` if you build more than one package from the same repo

```ts
VersionPlugin({
  strategies: [Strategies.git({ packageName: 'my-package' })],
});
```

### Step 4: Check anything that parses the version string's shape

If you have code that assumes `main`'s version is always plain `major.minor.patch`
(no label), re-check it against the new label-preserving format described above.

### Step 5: Test and verify

```bash
# Check for TypeScript errors
tsc --noEmit

# Build and inspect the injected version module for a couple of branches
```

## Comparison

### Before (v1.x)

```ts
import VersionPlugin from '@shellicar/build-version/vite';

export default {
  plugins: [
    VersionPlugin({
      versionCalculator: 'git',
      strict: true,
    }),
  ],
};
```

### After (v2.x)

```ts
import VersionPlugin from '@shellicar/build-version/vite';
import { Strategies } from '@shellicar/build-version/types';

export default {
  plugins: [
    VersionPlugin({
      strategies: [Strategies.git({ packageName: 'my-package' }), Strategies.fallback('0.1.0')],
      strict: true,
    }),
  ],
};
```

## Migration Checklist

- [ ] Update package version to v2.x
- [ ] Replace every `versionCalculator` option with a `strategies` list
- [ ] Add `packageName` to `Strategies.git()` if several packages share a repo
- [ ] Re-check any code parsing `main`'s version string for the preserved pre-release label
- [ ] Run `tsc --noEmit` and rebuild

## Troubleshooting

### TypeScript Errors

**Error**: `Object literal may only specify known properties, and 'versionCalculator' does not exist in type 'Options'`\
**Solution**: Replace `versionCalculator` with `strategies`, per the table above.

### Runtime / Behavioural

**Symptom**: A version that used to read `1.0.1` on `main` now reads `1.0.0-beta.22.1`.\
**Solution**: Expected, see [Details → Changed](#changed-pre-release-labels-on-main-are-preserved). The label is now preserved instead of discarded.

**Symptom**: The wrong package's version shows up when several packages share a
tagged commit.\
**Solution**: Pass `packageName` to `Strategies.git()` so tag matching is scoped
to that package.

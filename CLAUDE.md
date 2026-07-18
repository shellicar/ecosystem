# @shellicar/ecosystem

Start — CI and release process only. Rest of the repo still needs writing up.

## CI pipeline

`.github/workflows/ci.yml` is the one entrypoint, dispatching by event:

- **PR / push to `main`** — `checks.yml` (whole-workspace build, type-check, test, lint,
  changelog validation), plus `build-package.yml` per affected package. That build prunes
  to the package's subtree with `turbo prune` — the same build release publishes — so a
  pruning break surfaces before merge instead of at release.
- **`release` / `workflow_dispatch`** — builds the tagged package the same way, then
  `publish-generic.yml` restores that artifact (no rebuild) and publishes it.

## Trusted publishing gotcha

Publishing uses npm Trusted Publishing: OIDC, no token, and npm trusts this repo only for
the exact publish workflow filename it's configured with — separately per package.

Renaming or restructuring the publish workflow breaks publishing silently until npm's
trusted-publisher config is updated to match. Nothing in CI catches this; it only shows
up as a failed release. Check npm's trusted-publisher settings for every published
package before merging a change to the publish workflow.

## Release process

Releases are per-package with independent versions — not lockstep. Tag format is
`<package-name>@<version>` (e.g. `build-clean@1.4.0`).

Each package has its own `changes.jsonl` and a `CHANGELOG.md` generated from it. CI fails
if they drift, so after editing a `changes.jsonl`, regenerate all changelogs:

```bash
pnpm --filter scripts run changelog
```

To cut a release: bump the package's version, regenerate its changelog, merge, then run

```bash
gh release create "<package>@<version>" ...
```

which triggers the publish path for that one package.

# @shellicar Package Dependency Graph

This document describes the internal dependency relationships between @shellicar packages.

## Maintenance Release Order

When a CVE or breaking change affects a foundational package, update packages in this order:

### Tier 0 - No @shellicar Dependencies (can be updated in parallel)

- `@shellicar/build-clean`
- `@shellicar/winston-azure-application-insights`

### Tier 1 - Depends only on Tier 0

- `@shellicar/build-version` → depends on: build-clean
- `@shellicar/core-di` → depends on: build-clean
- `@shellicar/core-config` → depends on: build-clean
- `@shellicar/cosmos-query-builder` → depends on: build-clean
- `@shellicar/build-azure-local-settings` → depends on: build-clean
- `@shellicar/build-graphql` → depends on: build-clean
- `@shellicar/svelte-adapter-azure-functions` → depends on: build-clean

### Tier 2 - Reference Architectures (consume multiple packages)

- `@shellicar/reference-foundation` → depends on: core-di, winston-azure-application-insights, build-graphql, build-version
- `@shellicar/reference-enterprise` → depends on: core-di, core-config, winston-azure-application-insights, build-clean, build-graphql, build-version

## Detailed Dependencies

### Published Packages

| Package | @shellicar Dependencies |
|---------|------------------------|
| build-clean | (none) |
| winston-azure-application-insights | (none) |
| build-version | build-clean |
| core-di | build-clean |
| core-config | build-clean |
| cosmos-query-builder | build-clean |
| build-azure-local-settings | build-clean |
| build-graphql | build-clean |
| svelte-adapter-azure-functions | build-clean |

### Reference Repositories

These are not published but consume the packages above:

| Package | Production Dependencies | Dev Dependencies |
|---------|------------------------|------------------|
| reference-foundation | core-di, winston-azure-application-insights | build-graphql, build-version |
| reference-enterprise | core-di, core-config, winston-azure-application-insights | build-clean, build-graphql, build-version |

## CVE Propagation Example

If a CVE is found in a transitive dependency of `build-clean`:

1. Fix and release `build-clean` first (Tier 0)
2. Update all Tier 1 packages that depend on `build-clean`
3. Update Tier 2 reference architectures last

This ensures each package gets the fix through its direct dependency rather than needing multiple update cycles.

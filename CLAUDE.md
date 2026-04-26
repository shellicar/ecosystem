# @shellicar/ecosystem

## Convention

This repository uses `shellicar-oss` conventions.

## Architecture

pnpm monorepo workspace with turbo task orchestration, biome lint/format. All 10 @shellicar/* packages imported. `packages/typescript-config` for shared tsconfig.

## Conventions

- **TypeScript** throughout
- **tsup** for building
- **Biome** for linting/formatting
- **Lefthook** for git hooks
- **@shellicar/changes** for per-package changelogs

#!/bin/sh
# Pre-flight checks for maintenance release
#
# Verifies repository state and reports findings in a structured format.
# Does NOT fail on dirty tree — reports it for the caller to decide.
#
# Usage:
#   preflight.sh              # Run in current directory
#
# Output:
#   Structured report of repository state including:
#   - Current branch
#   - Sync status with remote
#   - Working tree status (clean/dirty with details)
#   - Stale local branches
#   - pnpm audit summary
#   - Available updates (via ncu)

set -e

# ── Git state ────────────────────────────────────────────────────────

printf "═══ Git State ═══\n\n"

branch=$(git branch --show-current)
printf "Branch: %s\n" "$branch"

git fetch origin --quiet

# Sync status
set +e
local_sha=$(git rev-parse HEAD 2>/dev/null)
remote_sha=$(git rev-parse "origin/${branch}" 2>/dev/null)
set -e

if [ "$local_sha" = "$remote_sha" ]; then
  printf "Sync: up to date with origin/%s\n" "$branch"
else
  behind=$(git rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "?")
  ahead=$(git rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo "?")
  printf "Sync: diverged (ahead: %s, behind: %s)\n" "$ahead" "$behind"
fi

# Working tree
printf "\n"
tree_status=$(git status --porcelain)
if [ -z "$tree_status" ]; then
  printf "Tree: clean\n"
else
  printf "Tree: dirty\n"
  printf "%s\n" "$tree_status" | while IFS= read -r line; do
    printf "  %s\n" "$line"
  done
fi

# Stale branches
printf "\n"
stale=$(git branch --list | grep -v "^\*" | grep -v "^  main$" | grep -v "^  master$" || true)
if [ -n "$stale" ]; then
  printf "Stale branches:\n"
  printf "%s\n" "$stale" | while IFS= read -r line; do
    printf "  %s\n" "$line"
  done
else
  printf "Stale branches: none\n"
fi

# ── Security audit ───────────────────────────────────────────────────

printf "\n═══ Security Audit ═══\n\n"

set +e
audit_output=$(pnpm audit 2>&1)
audit_status=$?
set -e

if [ "$audit_status" -eq 0 ]; then
  printf "Audit: clean (0 vulnerabilities)\n"
else
  printf "%s\n" "$audit_output"
fi

# ── Available updates ────────────────────────────────────────────────

printf "\n═══ Available Updates ═══\n\n"

if command -v pnpm >/dev/null 2>&1; then
  set +e
  has_ncu=$(pnpm exec npm-check-updates --version 2>/dev/null)
  set -e

  if [ -n "$has_ncu" ]; then
    pnpm exec npm-check-updates --workspaces --reject syncpack 2>&1
  else
    printf "ncu not installed, trying pnpm outdated -r\n"
    set +e
    pnpm outdated -r 2>&1
    set -e
  fi
else
  printf "pnpm not available\n"
fi

# ── Version ──────────────────────────────────────────────────────────

printf "\n═══ Current Version ═══\n\n"

set +e
version=$(node -e "const p=require('./package.json'); process.stdout.write(p.version || 'unknown')" 2>/dev/null)
set -e

if [ -z "$version" ]; then
  # Try packages subdirectory
  for pkg_json in packages/*/package.json; do
    if [ -f "$pkg_json" ]; then
      set +e
      v=$(node -e "const p=require('./${pkg_json}'); if(!p.private || p.private===false) process.stdout.write(p.name + '@' + p.version)" 2>/dev/null)
      set -e
      if [ -n "$v" ]; then
        printf "%s\n" "$v"
      fi
    fi
  done
else
  printf "Root: %s\n" "$version"
fi

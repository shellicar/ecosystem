#!/bin/sh
# Pre-flight checks for maintenance release.
# Outputs JSON.
#
# Usage:
#   preflight.sh              # Run in current directory

set -eu

json_str() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' '
}

# ── Git state ────────────────────────────────────────────────────────

branch=$(git branch --show-current)

git fetch origin --quiet 2>/dev/null

set +e
local_sha=$(git rev-parse HEAD 2>/dev/null)
remote_sha=$(git rev-parse "origin/${branch}" 2>/dev/null)
set -e

if [ "$local_sha" = "$remote_sha" ]; then
  sync_status="up_to_date"
  ahead=0
  behind=0
else
  behind=$(git rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "0")
  ahead=$(git rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo "0")
  sync_status="diverged"
fi

# Working tree
tree_status=$(git status --porcelain)
if [ -z "$tree_status" ]; then
  tree="clean"
  tree_files=""
else
  tree="dirty"
  tree_files=$(json_str "$tree_status")
fi

# Stale branches
stale=$(git branch --list | grep -v "^\*" | grep -v "^  main$" | grep -v "^  master$" | sed 's/^  //' || true)
stale_count=0
stale_json=""
if [ -n "$stale" ]; then
  first=1
  for b in $stale; do
    stale_count=$((stale_count + 1))
    if [ "$first" = "1" ]; then
      stale_json="\"$b\""
      first=0
    else
      stale_json="${stale_json},\"$b\""
    fi
  done
fi

# ── Security audit ───────────────────────────────────────────────────

set +e
pnpm audit > /dev/null 2>&1
audit_rc=$?
set -e

if [ "$audit_rc" -eq 0 ]; then
  audit_status="clean"
else
  audit_status="vulnerable"
fi

# ── Available updates ────────────────────────────────────────────────

updates_status="unknown"
updates_output=""
if command -v pnpm >/dev/null 2>&1; then
  set +e
  has_ncu=$(pnpm exec npm-check-updates --version 2>/dev/null)
  set -e

  if [ -n "$has_ncu" ]; then
    set +e
    ncu_output=$(pnpm exec npm-check-updates --workspaces --reject syncpack 2>&1)
    ncu_rc=$?
    set -e

    if printf '%s' "$ncu_output" | grep -q "All dependencies match"; then
      updates_status="up_to_date"
    else
      updates_status="available"
      updates_output=$(json_str "$ncu_output")
    fi
  fi
fi

# ── Version ──────────────────────────────────────────────────────────

set +e
version=$(node -e "const p=require('./package.json'); process.stdout.write(p.version || 'unknown')" 2>/dev/null)
set -e

if [ -z "$version" ]; then
  version=""
  for pkg_json in packages/*/package.json; do
    if [ -f "$pkg_json" ]; then
      set +e
      v=$(node -e "const p=require('./${pkg_json}'); if(!p.private || p.private===false) process.stdout.write(p.name + '@' + p.version)" 2>/dev/null)
      set -e
      if [ -n "$v" ]; then
        version="$v"
        break
      fi
    fi
  done
fi

# ── JSON output ──────────────────────────────────────────────────────

printf '{'
printf '"branch":"%s"' "$branch"
printf ',"sync":{"status":"%s","ahead":%d,"behind":%d}' "$sync_status" "$ahead" "$behind"
printf ',"tree":"%s"' "$tree"
if [ -n "$tree_files" ]; then
  printf ',"tree_files":"%s"' "$tree_files"
fi
printf ',"stale_branches":{"count":%d,"branches":[%s]}' "$stale_count" "$stale_json"
printf ',"audit":"%s"' "$audit_status"
printf ',"updates":"%s"' "$updates_status"
if [ -n "$updates_output" ]; then
  printf ',"updates_output":"%s"' "$updates_output"
fi
if [ -n "$version" ]; then
  printf ',"version":"%s"' "$version"
fi
printf '}\n'

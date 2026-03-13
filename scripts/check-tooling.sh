#!/bin/sh
# Check tooling versions across @shellicar repositories.
# Outputs JSON.
#
# Usage:
#   check-tooling.sh              # All repos
#   check-tooling.sh -p <name>    # Single repo

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

SINGLE_PACKAGE=""
while [ $# -gt 0 ]; do
  case "$1" in
    -p|--package) SINGLE_PACKAGE="$2"; shift 2 ;;
    -h|--help)
      printf "Usage: %s [-p|--package <name>]\n" "$0"
      exit 0
      ;;
    *) printf "Unknown option: %s\n" "$1" >&2; exit 1 ;;
  esac
done

get_pnpm_version() {
  grep '"packageManager":' "$1" 2>/dev/null | sed 's/.*pnpm@\([^+"]*\).*/\1/' || printf ""
}

get_node_version() {
  tr -d '[:space:]' < "$1" 2>/dev/null || printf ""
}

get_dev_dependency() {
  grep "\"$2\":" "$1" 2>/dev/null | sed 's/.*": *"[\^~]*\([^"]*\)".*/\1/' || printf ""
}

get_workspace_dependency() {
  newest=""
  for pkg in "$1/package.json" "$1"/packages/*/package.json; do
    [ -f "$pkg" ] || continue
    v=$(get_dev_dependency "$pkg" "$2")
    if [ -n "$v" ]; then
      if [ -z "$newest" ] || [ "$(printf '%s\n%s' "$newest" "$v" | sort -V | tail -1)" = "$v" ]; then
        newest=$v
      fi
    fi
  done
  printf "%s" "$newest"
}

collect_repos() {
  for dir in $ALL_REPO_DIRS; do
    name=$(basename "$dir")
    [ "$name" = "ecosystem" ] && continue
    [ "$name" = "repro" ] && continue
    [ -f "$dir/package.json" ] && printf "%s\n" "$dir"
  done
}

npm_latest() {
  npm view "$1" version 2>/dev/null || printf "unknown"
}

version_status() {
  current="$1" latest="$2"
  [ -z "$current" ] && { printf "missing"; return; }
  [ "$latest" = "unknown" ] && { printf "unknown"; return; }
  [ "$current" = "$latest" ] && { printf "ok"; return; }
  cur_major=$(printf "%s" "$current" | cut -d. -f1)
  lat_major=$(printf "%s" "$latest" | cut -d. -f1)
  cur_minor=$(printf "%s" "$current" | cut -d. -f2)
  lat_minor=$(printf "%s" "$latest" | cut -d. -f2)
  [ "$cur_major" != "$lat_major" ] && { printf "major"; return; }
  [ "$cur_minor" != "$lat_minor" ] && { printf "minor"; return; }
  printf "patch"
}

# ── Single package mode ───────────────────────────────────────────

if [ -n "$SINGLE_PACKAGE" ]; then
  repo_dir="$(repo_path "$SINGLE_PACKAGE")"
  if [ ! -d "$repo_dir" ] || [ ! -f "$repo_dir/package.json" ]; then
    printf '{"error":"package not found: %s"}\n' "$SINGLE_PACKAGE"
    exit 1
  fi

  node_ver=""; nvmrc="$repo_dir/.nvmrc"
  [ -f "$nvmrc" ] && node_ver=$(get_node_version "$nvmrc")

  pnpm_ver=$(get_pnpm_version "$repo_dir/package.json")
  pnpm_latest=$(npm_latest pnpm)

  turbo_ver=$(get_dev_dependency "$repo_dir/package.json" "turbo")
  turbo_latest=$(npm_latest turbo)

  ts_ver=$(get_workspace_dependency "$repo_dir" "typescript")
  ts_latest=$(npm_latest typescript)

  lh_ver=$(get_dev_dependency "$repo_dir/package.json" "lefthook")
  lh_latest=$(npm_latest lefthook)

  sp_ver=$(get_dev_dependency "$repo_dir/package.json" "syncpack")
  sp_latest=$(npm_latest syncpack)

  printf '{"repo":"%s","node":"%s","pnpm":{"version":"%s","latest":"%s","status":"%s"},"turbo":{"version":"%s","latest":"%s","status":"%s"},"typescript":{"version":"%s","latest":"%s","status":"%s"},"lefthook":{"version":"%s","latest":"%s","status":"%s"},"syncpack":{"version":"%s","latest":"%s","status":"%s"}}\n' \
    "$SINGLE_PACKAGE" "$node_ver" \
    "$pnpm_ver" "$pnpm_latest" "$(version_status "$pnpm_ver" "$pnpm_latest")" \
    "$turbo_ver" "$turbo_latest" "$(version_status "$turbo_ver" "$turbo_latest")" \
    "$ts_ver" "$ts_latest" "$(version_status "$ts_ver" "$ts_latest")" \
    "$lh_ver" "$lh_latest" "$(version_status "$lh_ver" "$lh_latest")" \
    "$sp_ver" "$sp_latest" "$(version_status "$sp_ver" "$sp_latest")"
  exit 0
fi

# ── All repos mode ────────────────────────────────────────────────

pnpm_latest=$(npm_latest pnpm)
turbo_latest=$(npm_latest turbo)
ts_latest=$(npm_latest typescript)
lh_latest=$(npm_latest lefthook)
sp_latest=$(npm_latest syncpack)

REPOS_JSON=""
FIRST_REPO=1

for repo_dir in $(collect_repos); do
  repo=$(basename "$repo_dir")

  node_ver=""; nvmrc="$repo_dir/.nvmrc"
  [ -f "$nvmrc" ] && node_ver=$(get_node_version "$nvmrc")

  pnpm_ver=$(get_pnpm_version "$repo_dir/package.json")
  turbo_ver=$(get_dev_dependency "$repo_dir/package.json" "turbo")
  ts_ver=$(get_workspace_dependency "$repo_dir" "typescript")
  lh_ver=$(get_dev_dependency "$repo_dir/package.json" "lefthook")
  sp_ver=$(get_dev_dependency "$repo_dir/package.json" "syncpack")

  entry=$(printf '{"repo":"%s","node":"%s","pnpm":{"version":"%s","status":"%s"},"turbo":{"version":"%s","status":"%s"},"typescript":{"version":"%s","status":"%s"},"lefthook":{"version":"%s","status":"%s"},"syncpack":{"version":"%s","status":"%s"}}' \
    "$repo" "$node_ver" \
    "$pnpm_ver" "$(version_status "$pnpm_ver" "$pnpm_latest")" \
    "$turbo_ver" "$(version_status "$turbo_ver" "$turbo_latest")" \
    "$ts_ver" "$(version_status "$ts_ver" "$ts_latest")" \
    "$lh_ver" "$(version_status "$lh_ver" "$lh_latest")" \
    "$sp_ver" "$(version_status "$sp_ver" "$sp_latest")")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

printf '{"latest":{"pnpm":"%s","turbo":"%s","typescript":"%s","lefthook":"%s","syncpack":"%s"},"repos":[%s]}\n' \
  "$pnpm_latest" "$turbo_latest" "$ts_latest" "$lh_latest" "$sp_latest" "$REPOS_JSON"

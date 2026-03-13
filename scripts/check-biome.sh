#!/bin/sh
# Check Biome version consistency across @shellicar repositories.
# Outputs JSON.
#
# Usage:
#   check-biome.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

# Extract version from package.json devDependencies
get_installed_version() {
  grep '"@biomejs/biome":' "$1" 2>/dev/null |
    sed 's/.*": *"[\^~]*\([^"]*\)".*/\1/' || printf ""
}

# Extract schema version from biome.json (versioned URL only)
get_schema_version() {
  grep '"$schema":' "$1" 2>/dev/null |
    grep -o '/schemas/[^/]*/schema\.json' |
    sed 's|/schemas/\([^/]*\)/schema\.json|\1|' || printf ""
}

version_lt() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s' "$1" "$2" | sort -V | head -n1)" = "$1" ]
}

json_str() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

latest=$(npm view @biomejs/biome version 2>/dev/null || printf "unknown")

REPOS_JSON=""
FIRST_REPO=1

for repo_dir in $ALL_REPO_DIRS; do
  repo_name=$(basename "$repo_dir")
  [ "$repo_name" = "ecosystem" ] && continue

  biome_json="$repo_dir/biome.json"
  pkg_json="$repo_dir/package.json"
  if [ ! -f "$biome_json" ] || [ ! -f "$pkg_json" ]; then
    continue
  fi

  installed=$(get_installed_version "$pkg_json")
  schema=$(get_schema_version "$biome_json")

  if [ -z "$installed" ]; then
    status="missing"
  elif [ "$latest" != "unknown" ] && version_lt "$installed" "$latest"; then
    status="outdated"
  elif [ -n "$schema" ] && [ "$schema" != "$installed" ]; then
    status="schema_mismatch"
  else
    status="ok"
  fi

  entry=$(printf '{"repo":"%s","installed":"%s","schema":"%s","latest":"%s","status":"%s"}' \
    "$repo_name" "$installed" "$(json_str "$schema")" "$latest" "$status")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

printf '{"latest":"%s","repos":[%s]}\n' "$latest" "$REPOS_JSON"

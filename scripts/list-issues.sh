#!/bin/sh
# List open GitHub issues across @shellicar repositories.
# Outputs JSON.
#
# Usage:
#   list-issues.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

REPOS_JSON=""
FIRST_REPO=1
total=0

for repo in $ALL_REPOS; do
  issues=$(gh issue list --repo "shellicar/$repo" --json number,state,title,author 2>/dev/null || printf "[]")
  if [ -z "$issues" ]; then
    issues="[]"
  fi

  count=$(printf '%s' "$issues" | grep -c '"number"' || true)
  total=$((total + count))

  entry=$(printf '{"repo":"%s","count":%d,"issues":%s}' "$repo" "$count" "$issues")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

printf '{"repos":[%s],"total":%d}\n' "$REPOS_JSON" "$total"

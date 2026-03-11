#!/bin/sh
# List open GitHub pull requests across @shellicar repositories.
# Outputs JSON.
#
# Usage:
#   list-prs.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

REPOS_JSON=""
FIRST_REPO=1
total=0

for repo in $ALL_REPOS; do
  prs=$(gh pr list --repo "shellicar/$repo" --json number,state,title,author 2>/dev/null || printf "[]")
  if [ -z "$prs" ]; then
    prs="[]"
  fi

  count=$(printf '%s' "$prs" | grep -c '"number"' || true)
  total=$((total + count))

  entry=$(printf '{"repo":"%s","count":%d,"prs":%s}' "$repo" "$count" "$prs")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

printf '{"repos":[%s],"total":%d}\n' "$REPOS_JSON" "$total"

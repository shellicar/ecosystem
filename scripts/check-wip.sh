#!/bin/sh
# Check for work-in-progress across all repos.
# Outputs JSON.
#
# Usage:
#   check-wip.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

json_str() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' '
}

REPOS_JSON=""
FIRST_REPO=1

for dir in $ALL_REPO_DIRS; do
  if [ ! -d "$dir/.git" ]; then
    continue
  fi

  repo_name=$(basename "$dir")
  cd "$dir"

  git fetch origin --quiet 2>/dev/null

  # Determine default branch
  default_branch="main"
  if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
    if git rev-parse --verify origin/master >/dev/null 2>&1; then
      default_branch="master"
    else
      continue
    fi
  fi

  current_branch=$(git branch --show-current)

  # Uncommitted changes
  uncommitted=$(git status --porcelain 2>/dev/null)
  has_uncommitted="false"
  unstaged_stats=""
  staged_stats=""
  if [ -n "$uncommitted" ]; then
    has_uncommitted="true"
    unstaged_stats=$(git diff --shortstat 2>/dev/null | sed 's/^ *//')
    staged_stats=$(git diff --cached --shortstat 2>/dev/null | sed 's/^ *//')
  fi

  # Commits newer than origin/default_branch
  main_timestamp=$(git log -1 --format=%ct "origin/$default_branch" 2>/dev/null)
  commits_count=0
  committed_stats=""

  TMPFILE=$(mktemp)
  git log HEAD --format="%ct %h %s" 2>/dev/null | while IFS= read -r line; do
    ts=$(echo "$line" | cut -d' ' -f1)
    if [ -n "$ts" ] && [ "$ts" -gt "$main_timestamp" ] 2>/dev/null; then
      echo "$line" | cut -d' ' -f2-
    fi
  done > "$TMPFILE"

  if [ -s "$TMPFILE" ]; then
    commits_count=$(wc -l < "$TMPFILE" | tr -d ' ')
    committed_stats=$(git diff "origin/$default_branch" HEAD --shortstat 2>/dev/null | sed 's/^ *//')
  fi
  rm -f "$TMPFILE"

  # Stale branch detection
  is_stale="false"
  if [ "$current_branch" != "$default_branch" ] && [ "$commits_count" -eq 0 ]; then
    is_stale="true"
  fi

  # Categorize
  category="clean"
  if [ "$commits_count" -gt 0 ]; then
    case "$current_branch" in
      security*|dependabot*) category="security" ;;
      *) category="active" ;;
    esac
  elif [ "$is_stale" = "true" ]; then
    category="stale"
  elif [ "$has_uncommitted" = "true" ]; then
    category="uncommitted"
  fi

  # Skip clean repos
  if [ "$category" = "clean" ]; then
    continue
  fi

  # Build JSON entry
  entry=$(printf '{"repo":"%s","branch":"%s","category":"%s","commits":%d,"uncommitted":%s' \
    "$repo_name" "$current_branch" "$category" "$commits_count" "$has_uncommitted")

  if [ -n "$committed_stats" ]; then
    entry="${entry},\"committed_stats\":\"$(json_str "$committed_stats")\""
  fi
  if [ -n "$unstaged_stats" ]; then
    entry="${entry},\"unstaged_stats\":\"$(json_str "$unstaged_stats")\""
  fi
  if [ -n "$staged_stats" ]; then
    entry="${entry},\"staged_stats\":\"$(json_str "$staged_stats")\""
  fi
  entry="${entry}}"

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

printf '{"repos":[%s]}\n' "$REPOS_JSON"

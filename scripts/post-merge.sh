#!/bin/sh
# Post-merge cleanup: switch to main, pull, delete merged branch
#
# Verifies the branch was actually merged before deleting.
# Safe to auto-approve because it only deletes branches with
# confirmed merged PRs.
#
# Usage:
#   post-merge.sh                    # Auto-detect branch to clean
#   post-merge.sh --branch <name>    # Clean specific branch
#
# Options:
#   --branch <name>   Branch to clean up (default: current branch if not main)
#   -h, --help        Show this help message

set -e

BRANCH=""

while [ $# -gt 0 ]; do
  case "$1" in
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '/^#/!q;s/^# \{0,1\}//p' "$0" | tail -n +2
      exit 0
      ;;
    *)
      printf "❌ Unknown option: %s\n" "$1" >&2
      exit 1
      ;;
  esac
done

# ── Determine branch to clean ───────────────────────────────────────

current=$(git branch --show-current)

if [ -z "$BRANCH" ]; then
  if [ "$current" = "main" ] || [ "$current" = "master" ]; then
    printf "❌ Already on %s and no --branch specified\n" "$current" >&2
    printf "   Use: post-merge.sh --branch <name>\n" >&2
    exit 1
  fi
  BRANCH="$current"
fi

# ── Verify branch was merged ────────────────────────────────────────

printf "🔍 Checking if %s has a merged PR...\n" "$BRANCH"

set +e
merged_pr=$(gh pr list --head "$BRANCH" --state merged --json number,title --jq '.[0].number' 2>/dev/null)
set -e

if [ -z "$merged_pr" ]; then
  printf "❌ No merged PR found for branch '%s'\n" "$BRANCH" >&2
  printf "   Cannot safely delete — branch may not be merged\n" >&2
  exit 1
fi

printf "  ✅ PR #%s was merged\n\n" "$merged_pr"

# ── Switch to main ──────────────────────────────────────────────────

default_branch="main"
if ! git rev-parse --verify main >/dev/null 2>&1; then
  default_branch="master"
fi

if [ "$current" != "$default_branch" ]; then
  printf "🔄 Switching to %s...\n" "$default_branch"
  git switch "$default_branch"
fi

# ── Pull latest ─────────────────────────────────────────────────────

printf "📥 Pulling latest...\n"
git pull --quiet

# ── Prune remote references ─────────────────────────────────────────

printf "🧹 Pruning stale remote references...\n"
git fetch -p --quiet

# ── Delete local branch ─────────────────────────────────────────────

printf "🗑️  Deleting local branch '%s'...\n" "$BRANCH"
git branch -D "$BRANCH"

# ── Report ───────────────────────────────────────────────────────────

printf "\n✅ Cleanup complete\n"
printf "   Branch: %s (deleted)\n" "$BRANCH"
printf "   PR: #%s (merged)\n" "$merged_pr"
printf "   Now on: %s\n" "$default_branch"

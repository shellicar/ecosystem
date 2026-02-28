#!/bin/sh
# Ensure standard labels exist on a GitHub repository
#
# Creates labels idempotently — silently skips if they already exist.
#
# Usage:
#   ensure-labels.sh --repo <name>
#   ensure-labels.sh --repo <name> --owner <owner>
#
# Options:
#   --repo <name>     Repository name (required)
#   --owner <owner>   GitHub owner (default: shellicar)
#   -h, --help        Show this help message

set -e

REPO=""
OWNER="shellicar"

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --owner)
      OWNER="$2"
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

if [ -z "$REPO" ]; then
  printf "❌ --repo is required\n" >&2
  exit 1
fi

FULL_REPO="${OWNER}/${REPO}"

# ── Label definitions ────────────────────────────────────────────────
# Format: name|color|description

LABELS="dependencies|0366d6|Dependency updates
bug|d73a4a|Something isn't working
enhancement|a2eeef|New feature or request
documentation|0075ca|Improvements or additions to documentation"

# ── Create labels ────────────────────────────────────────────────────

printf '%s\n' "$LABELS" | while IFS='|' read -r name color description; do
  set +e
  gh label create "$name" \
    --repo "$FULL_REPO" \
    --color "$color" \
    --description "$description" 2>/dev/null
  result=$?
  set -e

  if [ "$result" -eq 0 ]; then
    printf "  ✅ Created label: %s\n" "$name"
  else
    printf "  ⏭️  Label exists: %s\n" "$name"
  fi
done

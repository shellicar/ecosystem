#!/bin/sh
# Verify build and tests pass
#
# Runs pnpm build and pnpm test, capturing output.
# On success: prints a one-line summary
# On failure: prints the full output for diagnosis
#
# Usage:
#   verify.sh              # Run build + test
#   verify.sh --build      # Run build only
#   verify.sh --test       # Run test only
#
# Designed to minimise context consumption when called by Claude Code.

set -e

RUN_BUILD=1
RUN_TEST=1

for arg in "$@"; do
  case "$arg" in
    --build)
      RUN_BUILD=1
      RUN_TEST=0
      ;;
    --test)
      RUN_BUILD=0
      RUN_TEST=1
      ;;
    -h|--help)
      printf "Usage: verify.sh [--build|--test]\n"
      printf "  (no args)  Run both build and test\n"
      printf "  --build    Run build only\n"
      printf "  --test     Run test only\n"
      exit 0
      ;;
    *)
      printf "Unknown option: %s\n" "$arg" >&2
      exit 1
      ;;
  esac
done

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

# ── Build ─────────────────────────────────────────────────────────

if [ "$RUN_BUILD" -eq 1 ]; then
  printf "🔨 Building...\n"
  set +e
  pnpm run build > "$TMPFILE" 2>&1
  build_status=$?
  set -e

  if [ "$build_status" -ne 0 ]; then
    printf "❌ Build failed (exit %d):\n\n" "$build_status"
    cat "$TMPFILE"
    exit 1
  fi
  printf "  ✅ Build passed\n"
fi

# ── Test ──────────────────────────────────────────────────────────

if [ "$RUN_TEST" -eq 1 ]; then
  printf "🧪 Testing...\n"
  set +e
  pnpm run test > "$TMPFILE" 2>&1
  test_status=$?
  set -e

  if [ "$test_status" -ne 0 ]; then
    printf "❌ Tests failed (exit %d):\n\n" "$test_status"
    cat "$TMPFILE"
    exit 1
  fi
  printf "  ✅ Tests passed\n"
fi

printf "\n✅ Verification complete\n"

#!/bin/sh
# Verify build and tests pass.
# Outputs JSON.
#
# Usage:
#   verify.sh              # Run build + test
#   verify.sh --build      # Run build only
#   verify.sh --test       # Run test only

set -eu

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

json_str() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' '
}

build_status="skipped"
build_output=""
test_status="skipped"
test_output=""
exit_code=0

# ── Build ─────────────────────────────────────────────────────────

if [ "$RUN_BUILD" -eq 1 ]; then
  set +e
  pnpm run build > "$TMPFILE" 2>&1
  rc=$?
  set -e

  if [ "$rc" -eq 0 ]; then
    build_status="pass"
  else
    build_status="fail"
    build_output=$(cat "$TMPFILE")
    exit_code=1
  fi
fi

# ── Test ──────────────────────────────────────────────────────────

if [ "$RUN_TEST" -eq 1 ]; then
  set +e
  pnpm run test > "$TMPFILE" 2>&1
  rc=$?
  set -e

  if [ "$rc" -eq 0 ]; then
    test_status="pass"
  else
    test_status="fail"
    test_output=$(cat "$TMPFILE")
    exit_code=1
  fi
fi

# ── JSON output ───────────────────────────────────────────────────

printf '{"build":"%s"' "$build_status"
if [ -n "$build_output" ]; then
  printf ',"build_output":"%s"' "$(json_str "$build_output")"
fi
printf ',"test":"%s"' "$test_status"
if [ -n "$test_output" ]; then
  printf ',"test_output":"%s"' "$(json_str "$test_output")"
fi
printf '}\n'

exit "$exit_code"

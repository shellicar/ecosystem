#!/bin/sh
# Fix pnpm audit vulnerabilities with clean override resolution
#
# Runs pnpm audit --fix, then nukes lockfile + node_modules and
# reinstalls to work around the pnpm override chaining bug where
# overrides don't re-evaluate after a first override changes resolution.
#
# See: https://github.com/pnpm/pnpm/issues/6774
#
# Usage:
#   fix-audit.sh              # Run in current directory
#   fix-audit.sh --check      # Verify audit is clean (no fix)
#
# Exit codes:
#   0  Audit is clean (after fix, or already clean)
#   1  Audit still has vulnerabilities after fix

set -e

CHECK_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      shift
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

# Verify we're in a pnpm workspace
if [ ! -f "pnpm-workspace.yaml" ]; then
  printf "❌ No pnpm-workspace.yaml found in current directory\n" >&2
  exit 1
fi

# ── Check-only mode ──────────────────────────────────────────────────

if [ "$CHECK_ONLY" -eq 1 ]; then
  printf "🔍 Checking audit status...\n"
  set +e
  pnpm audit 2>&1
  status=$?
  set -e
  if [ "$status" -eq 0 ]; then
    printf "✅ Audit is clean\n"
    exit 0
  else
    printf "❌ Audit has vulnerabilities\n"
    exit 1
  fi
fi

# ── Fix mode ─────────────────────────────────────────────────────────

printf "🔧 Running pnpm audit --fix...\n"
set +e
pnpm audit --fix 2>&1
set -e

# pnpm override chaining bug workaround:
# When multiple overrides exist for the same package at different version
# ranges (e.g. koa@<2.16.4 and koa@>=3.0.0), pnpm doesn't re-evaluate
# the second override after the first one changes the resolved version.
# The only reliable fix is to delete both pnpm-lock.yaml AND node_modules
# then do a clean install.
#
# See: https://github.com/pnpm/pnpm/issues/6774
printf "\n🔄 Removing lockfile and node_modules for clean override resolution...\n"
printf "   (workaround for https://github.com/pnpm/pnpm/issues/6774)\n"
rm -f pnpm-lock.yaml
rm -rf node_modules
printf "📦 Reinstalling...\n"
pnpm install 2>&1

# ── Verify ───────────────────────────────────────────────────────────

printf "\n🔍 Verifying audit...\n"
set +e
pnpm audit 2>&1
status=$?
set -e

if [ "$status" -eq 0 ]; then
  printf "\n✅ Audit is clean\n"
  exit 0
else
  printf "\n❌ Audit still has vulnerabilities after fix\n" >&2
  exit 1
fi

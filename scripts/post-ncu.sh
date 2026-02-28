#!/bin/sh
# Post-ncu fixups: restore corepack SHA and run biome migrate
#
# After npm-check-updates modifies package.json, two things break:
#   1. The packageManager field loses its SHA hash (ncu strips it)
#   2. The biome.json schema URL becomes stale if biome was updated
#
# This script detects whether each fixup is needed and applies it.
#
# Usage:
#   post-ncu.sh              # Run in current directory
#
# Prerequisites:
#   - corepack (for corepack up)
#   - pnpm with biome installed (for biome migrate)

set -e

CHANGED=0

# ── Corepack SHA restoration ────────────────────────────────────────

if [ -f "package.json" ]; then
  # Check if packageManager field exists and has a pnpm version
  set +e
  pkg_manager=$(node -e "const p=require('./package.json'); if(p.packageManager) process.stdout.write(p.packageManager)" 2>/dev/null)
  set -e

  if printf '%s' "$pkg_manager" | grep -q "^pnpm@"; then
    # Check if SHA hash is present
    if printf '%s' "$pkg_manager" | grep -q "+sha"; then
      printf "✅ packageManager already has SHA hash\n"
    else
      printf "🔧 Restoring packageManager SHA hash via corepack up...\n"
      corepack up
      CHANGED=1
    fi
  fi
fi

# ── Biome migrate ───────────────────────────────────────────────────

if [ -f "biome.json" ]; then
  # Check if biome is available
  if command -v pnpm >/dev/null 2>&1; then
    set +e
    has_biome=$(pnpm exec biome --version 2>/dev/null)
    set -e

    if [ -n "$has_biome" ]; then
      printf "🔧 Running biome migrate...\n"
      pnpm biome migrate --write 2>&1
      CHANGED=1

      # Use local schema instead of remote URL
      printf "🔧 Updating biome.json schema to use local path...\n"
      node -e "
        const fs = require('fs');
        const f = 'biome.json';
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        j['\$schema'] = './node_modules/@biomejs/biome/configuration_schema.json';
        fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
      "

      # Check for lint/format errors from the upgrade
      # Use --write for safe auto-fixes only (NEVER --unsafe)
      printf "🔍 Running biome check...\n"
      set +e
      pnpm biome check --write --diagnostic-level=error 2>&1
      biome_status=$?
      set -e

      if [ "$biome_status" -ne 0 ]; then
        printf "\n⚠️  biome check found errors that need manual intervention\n"
        printf "   Run 'pnpm biome check' to see remaining issues\n"
        printf "   Do NOT use --unsafe — fix manually\n"
        exit 1
      fi
      printf "  ✅ biome check passed\n"
    else
      printf "⏭️  biome not installed, skipping migrate\n"
    fi
  fi
else
  printf "⏭️  No biome.json found, skipping migrate\n"
fi

# ── Reinstall if changes were made ──────────────────────────────────

if [ "$CHANGED" -eq 1 ]; then
  printf "\n📦 Running pnpm install to update lockfile...\n"
  pnpm install 2>&1
fi

printf "\n✅ Post-ncu fixups complete\n"

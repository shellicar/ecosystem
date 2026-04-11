#!/bin/sh
# Check dependency staleness across the @shellicar/ecosystem workspace.
# Outputs JSON with patch/minor/major outdated counts and a score.
#
# Scoring (compound decay per outdated dependency):
#   patch: × 0.90 each  (easy to apply, no excuse)
#   minor: × 0.93 each
#   major: × 0.97 each  (breaking changes, intentionally deferrable)
#
# Scores compound — each additional outdated package multiplies the remainder,
# so they stack harder as they pile up.
#
# Usage:
#   check-deps.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$WORKSPACE_DIR"

set +e
outdated_output=$(pnpm outdated --recursive --json 2>/dev/null)
set -e

if [ -z "$outdated_output" ] || [ "$outdated_output" = "{}" ]; then
  printf '{"patch":0,"minor":0,"major":0,"total":0,"pct":100}\n'
  exit 0
fi

printf '%s' "$outdated_output" | node -e "
  let d = ''; process.stdin.on('data', c => d += c).on('end', () => {
    try {
      const data = JSON.parse(d);
      const pkgs = Array.isArray(data) ? data : Object.values(data);
      let patch = 0, minor = 0, major = 0;
      for (const info of pkgs) {
        const cur = (info.current || '0').split('.').map(Number);
        const lat = (info.latest || info.wanted || '0').split('.').map(Number);
        if (lat[0] > cur[0]) major++;
        else if (lat[1] > cur[1]) minor++;
        else if (lat[2] > cur[2]) patch++;
      }
      const total = patch + minor + major;
      const pct = Math.round(100 * Math.pow(0.90, patch) * Math.pow(0.93, minor) * Math.pow(0.97, major));
      process.stdout.write(JSON.stringify({patch, minor, major, total, pct}) + '\n');
    } catch(e) {
      process.stdout.write('{\"patch\":0,\"minor\":0,\"major\":0,\"total\":0,\"pct\":100}\n');
    }
  });
"

#!/bin/sh
# Check dependency staleness across @shellicar library repos.
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
. "$SCRIPT_DIR/common"

REPOS_JSON=""
FIRST_REPO=1
TOTAL_REPOS=0

for dir in $ALL_REPO_DIRS; do
  repo=$(basename "$dir")
  if [ ! -d "$dir" ]; then
    continue
  fi
  cd "$dir"

  TOTAL_REPOS=$((TOTAL_REPOS + 1))

  set +e
  outdated_output=$(pnpm outdated --json 2>/dev/null)
  set -e

  if [ -z "$outdated_output" ] || [ "$outdated_output" = "{}" ]; then
    entry=$(printf '{"repo":"%s","patch":0,"minor":0,"major":0,"total":0,"pct":100}' "$repo")
  else
    counts=$(printf '%s' "$outdated_output" | node -e "
      let d = ''; process.stdin.on('data', c => d += c).on('end', () => {
        try {
          const data = JSON.parse(d);
          // pnpm outdated --json: array or object depending on version
          const pkgs = Array.isArray(data) ? data : Object.values(data);
          let patch = 0, minor = 0, major = 0;
          for (const info of pkgs) {
            const cur = (info.current || '0').split('.').map(Number);
            const lat = (info.latest || info.wanted || '0').split('.').map(Number);
            if (lat[0] > cur[0]) major++;
            else if (lat[1] > cur[1]) minor++;
            else if (lat[2] > cur[2]) patch++;
          }
          const pct = Math.round(100 * Math.pow(0.90, patch) * Math.pow(0.93, minor) * Math.pow(0.97, major));
          process.stdout.write([patch, minor, major, pct].join(' '));
        } catch(e) { process.stdout.write('0 0 0 100'); }
      });
    " 2>/dev/null || printf '0 0 0 100')

    patch=$(printf '%s' "$counts" | cut -d' ' -f1)
    minor=$(printf '%s' "$counts" | cut -d' ' -f2)
    major=$(printf '%s' "$counts" | cut -d' ' -f3)
    pct=$(printf '%s' "$counts" | cut -d' ' -f4)
    total=$((patch + minor + major))

    entry=$(printf '{"repo":"%s","patch":%d,"minor":%d,"major":%d,"total":%d,"pct":%d}' \
      "$repo" "$patch" "$minor" "$major" "$total" "$pct")
  fi

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

printf '{"repos":[%s],"total_repos":%d}\n' "$REPOS_JSON" "$TOTAL_REPOS"

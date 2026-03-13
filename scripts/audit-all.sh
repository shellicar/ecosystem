#!/bin/sh
# Run pnpm security audit across all @shellicar library repos.
# Outputs JSON with per-severity vulnerability counts.
#
# Usage:
#   audit-all.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

REPOS_JSON=""
FIRST_REPO=1
total_critical=0
total_high=0
total_moderate=0
total_low=0

for dir in $ALL_REPO_DIRS; do
  repo=$(basename "$dir")
  if [ ! -d "$dir" ]; then
    continue
  fi
  cd "$dir"

  set +e
  audit_output=$(pnpm audit --json 2>/dev/null)
  audit_rc=$?
  set -e

  if [ "$audit_rc" -eq 0 ]; then
    entry=$(printf '{"repo":"%s","status":"clean","critical":0,"high":0,"moderate":0,"low":0,"total":0}' "$repo")
  else
    counts=$(printf '%s' "$audit_output" | node -e "
      let d = ''; process.stdin.on('data', c => d += c).on('end', () => {
        try {
          const v = JSON.parse(d).metadata?.vulnerabilities || {};
          process.stdout.write([v.critical||0, v.high||0, v.moderate||0, v.low||0].join(' '));
        } catch(e) { process.stdout.write('0 0 0 0'); }
      });
    " 2>/dev/null || printf '0 0 0 0')

    crit=$(printf '%s' "$counts" | cut -d' ' -f1)
    high=$(printf '%s' "$counts" | cut -d' ' -f2)
    mod=$(printf '%s' "$counts" | cut -d' ' -f3)
    low=$(printf '%s' "$counts" | cut -d' ' -f4)
    total=$((crit + high + mod + low))

    total_critical=$((total_critical + crit))
    total_high=$((total_high + high))
    total_moderate=$((total_moderate + mod))
    total_low=$((total_low + low))

    entry=$(printf '{"repo":"%s","status":"vulnerable","critical":%d,"high":%d,"moderate":%d,"low":%d,"total":%d}' \
      "$repo" "$crit" "$high" "$mod" "$low" "$total")
  fi

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$entry"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${entry}"
  fi
done

total_vulns=$((total_critical + total_high + total_moderate + total_low))
printf '{"repos":[%s],"summary":{"critical":%d,"high":%d,"moderate":%d,"low":%d,"total":%d}}\n' \
  "$REPOS_JSON" "$total_critical" "$total_high" "$total_moderate" "$total_low" "$total_vulns"

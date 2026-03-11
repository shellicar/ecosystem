#!/bin/sh
# Audit migration task status across @shellicar repos.
# Outputs JSON.
#
# Checks (N/A items excluded from denominator):
#   lefthook scripts     20pts  (.lefthook/pre-push/ + scripts: in yml)
#   syncpack ^14.x       15pts  (N/A if not in devDeps)
#   unplugin ^3.x        10pts  (N/A if not in any package.json)
#   tsdown               5pts   (N/A if unplugin N/A)
#
# Usage:
#   ./check-migrations.sh              # Audit all repos (excludes ecosystem)
#   ./check-migrations.sh build-clean  # Audit a single repo

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_REPOS=0
REPOS_JSON=""
FIRST_REPO=1

REPO_SCORE=0
REPO_MAX=0
REPO_CHECKS=""
FIRST_CHECK=1
REPO_UNPLUGIN=0

json_str() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

add_check() {
  check="$1" status="$2" value="$3" points_earned="$4" points_max="$5"
  REPO_SCORE=$((REPO_SCORE + points_earned))
  REPO_MAX=$((REPO_MAX + points_max))
  case "$status" in
    warn)  TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1)) ;;
    error) TOTAL_ERRORS=$((TOTAL_ERRORS + 1)) ;;
  esac

  entry=$(printf '{"check":"%s","status":"%s","value":"%s","points":%d,"max":%d}' \
    "$(json_str "$check")" "$status" "$(json_str "$value")" "$points_earned" "$points_max")

  if [ "$FIRST_CHECK" = "1" ]; then
    REPO_CHECKS="$entry"
    FIRST_CHECK=0
  else
    REPO_CHECKS="${REPO_CHECKS},${entry}"
  fi
}

ok()    { add_check "$1" "ok"    "$2" "$3" "$3"; }
warn()  { add_check "$1" "warn"  "$2" 0    "$3"; }
error() { add_check "$1" "error" "$2" 0    "$3"; }

emit_repo() {
  name="$1"
  TOTAL_REPOS=$((TOTAL_REPOS + 1))

  if [ "$REPO_MAX" -eq 0 ]; then
    pct=0
  else
    pct=$((REPO_SCORE * 100 / REPO_MAX))
  fi

  repo_json=$(printf '{"name":"%s","score":%d,"max":%d,"pct":%d,"checks":[%s]}' \
    "$(json_str "$name")" "$REPO_SCORE" "$REPO_MAX" "$pct" "$REPO_CHECKS")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$repo_json"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${repo_json}"
  fi
}

pkg_version() {
  pkg_name="$1" pkg_file="$2"
  grep "\"${pkg_name}\"[[:space:]]*:[[:space:]]*\"" "$pkg_file" 2>/dev/null \
    | grep -o '"[0-9^~>=<][^"]*"' | head -1 | tr -d '"'
}

find_pkg_version() {
  pkg_name="$1" repo_dir="$2"
  for pkg_file in "$repo_dir/package.json" "$repo_dir"/packages/*/package.json; do
    if [ -f "$pkg_file" ]; then
      v=$(pkg_version "$pkg_name" "$pkg_file")
      if [ -n "$v" ]; then
        echo "$v"
        return 0
      fi
    fi
  done
  return 1
}

check_repo() {
  repo="$1"
  repo_dir="$WORKSPACE_DIR/$repo"
  REPO_SCORE=0
  REPO_MAX=0
  REPO_CHECKS=""
  FIRST_CHECK=1
  REPO_UNPLUGIN=0

  if [ ! -d "$repo_dir" ]; then
    add_check "repo" "error" "directory not found" 0 100
    emit_repo "$repo"
    return
  fi

  # --- 1. Lefthook scripts migration (20pts) ---
  lefthook_yml="$repo_dir/lefthook.yml"
  lefthook_pre_push="$repo_dir/.lefthook/pre-push"
  if [ ! -f "$lefthook_yml" ]; then
    error "lefthook_scripts" "no lefthook.yml" 20
  elif [ -d "$lefthook_pre_push" ] && grep -q 'scripts:' "$lefthook_yml" 2>/dev/null; then
    ok "lefthook_scripts" ".lefthook/pre-push/ + scripts: in yml" 20
  elif [ -d "$lefthook_pre_push" ]; then
    add_check "lefthook_scripts" "warn" ".lefthook/pre-push/ exists but no scripts: in yml" 10 20
  elif grep -q 'scripts:' "$lefthook_yml" 2>/dev/null; then
    add_check "lefthook_scripts" "warn" "scripts: in yml but no .lefthook/pre-push/ dir" 10 20
  else
    warn "lefthook_scripts" "inline commands only (no scripts: section)" 20
  fi

  # --- 2. Syncpack ^14.x (15pts, N/A if not in devDeps) ---
  if sp_version=$(find_pkg_version "syncpack" "$repo_dir"); then
    sp_major=$(echo "$sp_version" | grep -o '[0-9]*' | head -1)
    if [ "$sp_major" -ge 14 ] 2>/dev/null; then
      ok "syncpack" "$sp_version" 15
    else
      warn "syncpack" "$sp_version (should be ^14.x)" 15
    fi
  fi

  # --- 3. Unplugin ^3.x (10pts, N/A if not present) ---
  if up_version=$(find_pkg_version "unplugin" "$repo_dir"); then
    REPO_UNPLUGIN=1
    up_major=$(echo "$up_version" | grep -o '[0-9]*' | head -1)
    if [ "$up_major" -ge 3 ] 2>/dev/null; then
      ok "unplugin" "$up_version" 10
    else
      warn "unplugin" "$up_version (should be ^3.x)" 10
    fi
  fi

  # --- 4. tsdown (5pts, N/A if unplugin N/A) ---
  if [ "$REPO_UNPLUGIN" = "1" ]; then
    if td_version=$(find_pkg_version "tsdown" "$repo_dir"); then
      ok "tsdown" "$td_version" 5
    else
      error "tsdown" "missing (build plugin should have tsdown)" 5
    fi
  fi

  emit_repo "$repo"
}

if [ $# -gt 0 ]; then
  check_repo "$1"
else
  for repo in $ALL_REPOS; do
    if [ "$repo" = "ecosystem" ]; then
      continue
    fi
    check_repo "$repo"
  done
fi

printf '{"repos":[%s],"summary":{"total":%d,"errors":%d,"warnings":%d}}\n' \
  "$REPOS_JSON" "$TOTAL_REPOS" "$TOTAL_ERRORS" "$TOTAL_WARNINGS"

exit "$TOTAL_ERRORS"

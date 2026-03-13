#!/bin/sh
# Audit tsconfig.json settings across @shellicar library repos.
# Outputs JSON.
#
# Checks (130 points total):
#   extends node22+        20pts  (old version = 10pts, missing = 0pts)
#   verbatimModuleSyntax   20pts  (missing = 0pts)
#   moduleDetection        15pts  (missing = 0pts)
#   moduleResolution       25pts  (node = 0pts)
#   esModuleInterop stale   5pts  (present = 0pts)
#   skipLibCheck stale      5pts  (present = 0pts)
#   noEmit in source       10pts  (present = 0pts)
#   isolatedDeclarations   10pts  (missing = 0pts)
#   src_include            10pts  (not src/ scoped = 0pts)
#   check_json_pattern     10pts  (missing include+exclude = 0pts)
#
# Usage:
#   ./check-tsconfig.sh              # Audit all library repos
#   ./check-tsconfig.sh build-clean  # Audit a single repo

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_REPOS=0
REPOS_JSON=""
FIRST_REPO=1

REPO_SCORE=0
REPO_MAX=0
REPO_CHECKS=""
FIRST_CHECK=1

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
  name="$1" tsconfig="${2:-}"
  TOTAL_REPOS=$((TOTAL_REPOS + 1))

  if [ "$REPO_MAX" -eq 0 ]; then
    pct=0
  else
    pct=$((REPO_SCORE * 100 / REPO_MAX))
  fi

  repo_json=$(printf '{"name":"%s","tsconfig":"%s","score":%d,"max":%d,"pct":%d,"checks":[%s]}' \
    "$(json_str "$name")" "$(json_str "$tsconfig")" "$REPO_SCORE" "$REPO_MAX" "$pct" "$REPO_CHECKS")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$repo_json"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${repo_json}"
  fi
}

find_tsconfig() {
  repo_dir="$1"
  for pkg in "$repo_dir"/packages/*/tsconfig.json; do
    if [ -f "$pkg" ]; then
      echo "$pkg"
      return 0
    fi
  done
  if [ -f "$repo_dir/tsconfig.json" ]; then
    echo "$repo_dir/tsconfig.json"
    return 0
  fi
  return 1
}

find_tsconfig_check() {
  repo_dir="$1"
  for pkg in "$repo_dir"/packages/*/tsconfig.check.json; do
    if [ -f "$pkg" ]; then
      echo "$pkg"
      return 0
    fi
  done
  if [ -f "$repo_dir/tsconfig.check.json" ]; then
    echo "$repo_dir/tsconfig.check.json"
    return 0
  fi
  return 1
}

check_repo() {
  repo="$1"
  repo_dir="$WORKSPACE_DIR/$repo"
  REPO_SCORE=0
  REPO_MAX=0
  REPO_CHECKS=""
  FIRST_CHECK=1

  if ! tsconfig=$(find_tsconfig "$repo_dir"); then
    add_check "tsconfig" "error" "not found" 0 100
    emit_repo "$repo"
    return
  fi

  # extends @tsconfig/node22+  (20pts: ok=20, partial=10, error=0)
  if grep -q '@tsconfig/node' "$tsconfig" 2>/dev/null; then
    node_ver=$(grep -o '@tsconfig/node[0-9]*' "$tsconfig" | head -1)
    node_num=$(echo "$node_ver" | grep -o '[0-9]*$')
    if [ "$node_num" -ge 22 ]; then
      ok "extends" "$node_ver" 20
    else
      add_check "extends" "warn" "$node_ver (should be node22+)" 10 20
    fi
  elif grep -q '"extends"' "$tsconfig" 2>/dev/null; then
    extends_val=$(grep '"extends"' "$tsconfig" | head -1 | sed 's/.*"extends"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    warn "extends" "$extends_val (not @tsconfig/node22)" 20
  else
    error "extends" "missing" 20
  fi

  # verbatimModuleSyntax  (20pts)
  if grep -q '"verbatimModuleSyntax"[[:space:]]*:[[:space:]]*true' "$tsconfig" 2>/dev/null; then
    ok "verbatimModuleSyntax" "true" 20
  else
    warn "verbatimModuleSyntax" "missing" 20
  fi

  # moduleDetection  (15pts)
  if grep -q '"moduleDetection"[[:space:]]*:[[:space:]]*"force"' "$tsconfig" 2>/dev/null; then
    ok "moduleDetection" "force" 15
  else
    warn "moduleDetection" "missing" 15
  fi

  # moduleResolution  (25pts)
  if grep -q '"moduleResolution"[[:space:]]*:[[:space:]]*"node"' "$tsconfig" 2>/dev/null; then
    error "moduleResolution" "node (should be bundler)" 25
  elif grep -q '"moduleResolution"' "$tsconfig" 2>/dev/null; then
    ok "moduleResolution" "bundler" 25
  else
    ok "moduleResolution" "inherited" 25
  fi

  # esModuleInterop stale  (5pts)
  if grep -q '"esModuleInterop"' "$tsconfig" 2>/dev/null; then
    warn "esModuleInterop" "stale (remove from source tsconfig)" 5
  else
    ok "esModuleInterop" "absent" 5
  fi

  # skipLibCheck stale  (5pts)
  if grep -q '"skipLibCheck"' "$tsconfig" 2>/dev/null; then
    warn "skipLibCheck" "stale (remove from source tsconfig)" 5
  else
    ok "skipLibCheck" "absent" 5
  fi

  # noEmit in source  (10pts)
  if grep -q '"noEmit"[[:space:]]*:[[:space:]]*true' "$tsconfig" 2>/dev/null; then
    warn "noEmit" "true in source tsconfig (move to tsconfig.check.json)" 10
  else
    ok "noEmit" "absent" 10
  fi

  # isolatedDeclarations  (10pts)
  if grep -q '"isolatedDeclarations"[[:space:]]*:[[:space:]]*true' "$tsconfig" 2>/dev/null; then
    ok "isolatedDeclarations" "true" 10
  else
    warn "isolatedDeclarations" "missing" 10
  fi

  # src/ scoped include  (10pts)
  if grep -q '"include"' "$tsconfig" 2>/dev/null; then
    if grep '"include"' "$tsconfig" | grep -q '"src/'; then
      ok "src_include" "src/ scoped" 10
    else
      warn "src_include" "include present but not src/ scoped" 10
    fi
  else
    warn "src_include" "missing include" 10
  fi

  # tsconfig.check.json has include + exclude  (10pts)
  if check_json=$(find_tsconfig_check "$repo_dir"); then
    has_include=0
    has_exclude=0
    grep -q '"include"' "$check_json" 2>/dev/null && has_include=1
    grep -q '"exclude"' "$check_json" 2>/dev/null && has_exclude=1
    if [ "$has_include" = "1" ] && [ "$has_exclude" = "1" ]; then
      ok "check_json_pattern" "has include + exclude" 10
    elif [ "$has_include" = "1" ] || [ "$has_exclude" = "1" ]; then
      add_check "check_json_pattern" "warn" "missing include or exclude" 5 10
    else
      warn "check_json_pattern" "missing include and exclude" 10
    fi
  else
    warn "check_json_pattern" "no tsconfig.check.json" 10
  fi

  emit_repo "$repo" "$tsconfig"
}

if [ $# -gt 0 ]; then
  check_repo "$1"
else
  for repo in $LIBRARY_REPOS; do
    check_repo "$repo"
  done
fi

printf '{"repos":[%s],"summary":{"total":%d,"errors":%d,"warnings":%d}}\n' \
  "$REPOS_JSON" "$TOTAL_REPOS" "$TOTAL_ERRORS" "$TOTAL_WARNINGS"

exit "$TOTAL_ERRORS"

#!/bin/sh
# Audit resolved tsconfig settings across @shellicar/ecosystem packages.
# Uses tsc --showConfig to get the effective config, so inherited values count.
# Outputs JSON.
#
# Checks:
#   verbatimModuleSyntax: true   20pts
#   moduleDetection: force       15pts
#   moduleResolution: bundler    25pts  (node = error)
#   isolatedDeclarations: true   10pts
#   src/ scoped include          10pts
#   tsconfig.check.json present  10pts
#
# Usage:
#   check-tsconfig.sh              # Audit all packages
#   check-tsconfig.sh build-clean  # Audit a single package

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$WORKSPACE_DIR/packages"
TSC="$WORKSPACE_DIR/node_modules/.bin/tsc"

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

emit_pkg() {
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

check_pkg() {
  pkg_dir="${1%/}"
  pkg_name=$(basename "$pkg_dir")
  REPO_SCORE=0
  REPO_MAX=0
  REPO_CHECKS=""
  FIRST_CHECK=1

  tsconfig="$pkg_dir/tsconfig.json"
  if [ ! -f "$tsconfig" ]; then
    add_check "tsconfig" "error" "not found" 0 90
    emit_pkg "$pkg_name"
    return
  fi

  # Resolve full compiler options via tsc --showConfig
  set +e
  showconfig=$("$TSC" --showConfig -p "$tsconfig" 2>/dev/null)
  set -e

  # Extract compiler option values in one pass
  co_vals=$(printf '%s' "$showconfig" | node -e "
    let d = ''; process.stdin.on('data', c => d += c).on('end', () => {
      try {
        const co = JSON.parse(d).compilerOptions || {};
        const get = k => co[k] !== undefined ? String(co[k]) : '';
        [
          'verbatimModuleSyntax',
          'moduleDetection',
          'moduleResolution',
          'isolatedDeclarations',
        ].forEach(k => process.stdout.write(k + '=' + get(k) + '\n'));
      } catch(e) {}
    });
  " 2>/dev/null || true)

  co_get() { printf '%s' "$co_vals" | grep "^$1=" | sed "s/^$1=//"; }

  # verbatimModuleSyntax  (20pts)
  if [ "$(co_get verbatimModuleSyntax)" = "true" ]; then
    ok "verbatimModuleSyntax" "true" 20
  else
    warn "verbatimModuleSyntax" "missing" 20
  fi

  # moduleDetection  (15pts)
  md=$(co_get moduleDetection)
  if [ "$md" = "force" ]; then
    ok "moduleDetection" "force" 15
  else
    warn "moduleDetection" "${md:-missing}" 15
  fi

  # moduleResolution  (25pts)
  mr=$(co_get moduleResolution)
  case "$mr" in
    node*) error "moduleResolution" "$mr" 25 ;;
    "")    warn  "moduleResolution" "missing" 25 ;;
    *)     ok    "moduleResolution" "$mr" 25 ;;
  esac

  # isolatedDeclarations  (10pts)
  if [ "$(co_get isolatedDeclarations)" = "true" ]; then
    ok "isolatedDeclarations" "true" 10
  else
    warn "isolatedDeclarations" "missing" 10
  fi

  # src/ scoped include  (10pts)
  if grep -q '"include"' "$tsconfig" 2>/dev/null; then
    if grep '"include"' "$tsconfig" | grep -q '"src/'; then
      ok "src_include" "src/ scoped" 10
    else
      warn "src_include" "not src/ scoped" 10
    fi
  else
    warn "src_include" "missing" 10
  fi

  # tsconfig.check.json present  (10pts)
  if [ -f "$pkg_dir/tsconfig.check.json" ]; then
    ok "check_json" "present" 10
  else
    warn "check_json" "missing" 10
  fi

  emit_pkg "$pkg_name" "$tsconfig"
}

if [ $# -gt 0 ]; then
  check_pkg "$PACKAGES_DIR/$1"
else
  for pkg_dir in "$PACKAGES_DIR"/*/; do
    if grep -q '"private"[[:space:]]*:[[:space:]]*true' "$pkg_dir/package.json" 2>/dev/null; then
      continue
    fi
    check_pkg "$pkg_dir"
  done
fi

printf '{"repos":[%s],"summary":{"total":%d,"errors":%d,"warnings":%d}}\n' \
  "$REPOS_JSON" "$TOTAL_REPOS" "$TOTAL_ERRORS" "$TOTAL_WARNINGS"

exit "$TOTAL_ERRORS"

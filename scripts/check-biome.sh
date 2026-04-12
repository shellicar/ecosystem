#!/bin/sh
# Audit biome.json configuration across @shellicar/ecosystem packages.
# Outputs JSON.
#
# Checks per package (100pts total):
#   biome.json present      30pts
#   root: false             20pts
#   extends: "//"           30pts
#   linter rules overrides  20pts
#
# Usage:
#   check-biome.sh              # Audit all packages
#   check-biome.sh build-clean  # Audit a single package

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$WORKSPACE_DIR/packages"

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
  name="$1" biome_path="${2:-}"
  TOTAL_REPOS=$((TOTAL_REPOS + 1))

  if [ "$REPO_MAX" -eq 0 ]; then
    pct=0
  else
    pct=$((REPO_SCORE * 100 / REPO_MAX))
  fi

  repo_json=$(printf '{"name":"%s","biome":"%s","score":%d,"max":%d,"pct":%d,"checks":[%s]}' \
    "$(json_str "$name")" "$(json_str "$biome_path")" "$REPO_SCORE" "$REPO_MAX" "$pct" "$REPO_CHECKS")

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

  biome_file="$pkg_dir/biome.json"
  if [ ! -f "$biome_file" ]; then
    add_check "biome_json" "error" "not found" 0 100
    emit_pkg "$pkg_name"
    return
  fi

  ok "biome_json" "present" 30

  # Extract config values in one pass
  biome_vals=$(cat "$biome_file" | node -e "
    let d = ''; process.stdin.on('data', c => d += c).on('end', () => {
      try {
        const b = JSON.parse(d);
        const rules = (b.linter || {}).rules || {};
        const hasOverrides = Object.keys(rules).filter(k => k !== 'recommended').length > 0;
        process.stdout.write('root=' + (b.root !== undefined ? String(b.root) : '') + '\n');
        process.stdout.write('extends=' + (b.extends || '') + '\n');
        process.stdout.write('linter_rules_overrides=' + (hasOverrides ? 'true' : 'false') + '\n');
      } catch(e) {}
    });
  " 2>/dev/null || true)

  bv_get() { printf '%s' "$biome_vals" | grep "^$1=" | sed "s/^$1=//"; }

  # root: false  (20pts)
  root_val=$(bv_get root)
  if [ "$root_val" = "false" ]; then
    ok "root" "false" 20
  else
    warn "root" "${root_val:-missing}" 20
  fi

  # extends: "//"  (30pts)
  extends_val=$(bv_get extends)
  if [ "$extends_val" = "//" ]; then
    ok "extends" '"//"' 30
  else
    warn "extends" "${extends_val:-missing}" 30
  fi

  # linter rules overrides beyond recommended  (20pts)
  if [ "$(bv_get linter_rules_overrides)" = "true" ]; then
    ok "linter_rules" "has overrides" 20
  else
    warn "linter_rules" "only recommended" 20
  fi

  emit_pkg "$pkg_name" "$biome_file"
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

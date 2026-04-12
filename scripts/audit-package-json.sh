#!/bin/sh
# Audit package.json fields across @shellicar/ecosystem packages.
# Outputs JSON.
#
# Checks per package (100pts total):
#   private: false          5pts
#   type: module           10pts
#   license: MIT            5pts
#   author                  5pts
#   description             5pts
#   keywords                5pts
#   repository.url         10pts
#   bugs.url                5pts
#   homepage                5pts
#   publishConfig           5pts
#   exports structure      10pts
#   exports order           5pts
#   files array            10pts
#   scripts.build           5pts
#
# Usage:
#   audit-package-json.sh              # Audit all packages
#   audit-package-json.sh build-clean  # Audit a single package

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
  name="$1" pkg_path="${2:-}"
  TOTAL_REPOS=$((TOTAL_REPOS + 1))

  if [ "$REPO_MAX" -eq 0 ]; then pct=0
  else pct=$((REPO_SCORE * 100 / REPO_MAX))
  fi

  repo_json=$(printf '{"name":"%s","pkg":"%s","score":%d,"max":%d,"pct":%d,"checks":[%s]}' \
    "$(json_str "$name")" "$(json_str "$pkg_path")" "$REPO_SCORE" "$REPO_MAX" "$pct" "$REPO_CHECKS")

  if [ "$FIRST_REPO" = "1" ]; then
    REPOS_JSON="$repo_json"
    FIRST_REPO=0
  else
    REPOS_JSON="${REPOS_JSON},${repo_json}"
  fi
}

json_get() {
  node -e "
    const pkg = require('$1');
    const path = '$2'.split('.');
    let val = pkg;
    for (const p of path) {
      if (val == null) { process.exit(0); }
      val = val[p];
    }
    if (val === undefined) { process.exit(0); }
    if (typeof val === 'object') { console.log(JSON.stringify(val)); }
    else { console.log(val); }
  " 2>/dev/null
}

check_exports_nested() {
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$1', 'utf8'));
    const exports = pkg.exports;
    if (!exports) { console.log('missing'); process.exit(0); }
    if (exports['.']) { console.log('nested'); }
    else if (exports['import'] || exports['require'] || exports['types']) { console.log('flat'); }
    else { console.log('other'); }
  " 2>/dev/null
}

check_exports_order() {
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$1', 'utf8'));
    const exports = pkg.exports;
    if (!exports) { process.exit(0); }
    const entry = exports['.'] || exports;
    const keys = Object.keys(entry);
    const importIdx = keys.indexOf('import');
    const requireIdx = keys.indexOf('require');
    if (importIdx === -1 || requireIdx === -1) { process.exit(0); }
    console.log(importIdx > requireIdx ? 'require-first' : 'import-first');
  " 2>/dev/null
}

audit_pkg() {
  pkg_dir="${1%/}"
  pkg_name=$(basename "$pkg_dir")
  REPO_SCORE=0
  REPO_MAX=0
  REPO_CHECKS=""
  FIRST_CHECK=1

  pkg_path="$pkg_dir/package.json"
  if [ ! -f "$pkg_path" ]; then
    add_check "pkg" "error" "not found" 0 100
    emit_pkg "$pkg_name"
    return
  fi

  # private
  private_val=$(json_get "$pkg_path" "private")
  if [ "$private_val" = "false" ]; then   ok    "private" "false" 5
  elif [ -z "$private_val" ]; then        warn  "private" "missing" 5
  else                                    error "private" "$private_val" 5
  fi

  # type
  type_val=$(json_get "$pkg_path" "type")
  if [ "$type_val" = "module" ]; then ok    "type" "module" 10
  else                                error "type" "${type_val:-missing}" 10
  fi

  # license
  license_val=$(json_get "$pkg_path" "license")
  if [ "$license_val" = "MIT" ]; then ok    "license" "MIT" 5
  else                                error "license" "${license_val:-missing}" 5
  fi

  # author
  author_val=$(json_get "$pkg_path" "author")
  if [ "$author_val" = "Stephen Hellicar" ]; then ok   "author" "Stephen Hellicar" 5
  elif [ -z "$author_val" ]; then                 error "author" "missing" 5
  else                                            warn  "author" "$author_val" 5
  fi

  # description
  desc_val=$(json_get "$pkg_path" "description")
  if [ -n "$desc_val" ]; then ok    "description" "present" 5
  else                        error "description" "missing" 5
  fi

  # keywords
  kw_val=$(json_get "$pkg_path" "keywords")
  if [ -n "$kw_val" ] && [ "$kw_val" != "[]" ]; then ok   "keywords" "present" 5
  else                                               warn  "keywords" "missing or empty" 5
  fi

  # repository.url — all packages live in the same monorepo
  repo_url=$(json_get "$pkg_path" "repository.url")
  expected_url="git+https://github.com/shellicar/ecosystem.git"
  if [ "$repo_url" = "$expected_url" ]; then ok    "repository.url" "correct" 10
  elif [ -z "$repo_url" ]; then              error "repository.url" "missing" 10
  else                                       warn  "repository.url" "$repo_url" 10
  fi

  # bugs.url — check it points to the ecosystem issues page
  bugs_url=$(json_get "$pkg_path" "bugs.url")
  case "$bugs_url" in
    *github.com/shellicar/ecosystem/issues*) ok    "bugs.url" "correct" 5 ;;
    "")                                      error "bugs.url" "missing" 5 ;;
    *)                                       warn  "bugs.url" "$bugs_url" 5 ;;
  esac

  # homepage — per-package path within the monorepo
  homepage_val=$(json_get "$pkg_path" "homepage")
  expected_homepage="https://github.com/shellicar/ecosystem/tree/main/packages/${pkg_name}#readme"
  if [ "$homepage_val" = "$expected_homepage" ]; then ok    "homepage" "correct" 5
  elif [ -z "$homepage_val" ]; then                   error "homepage" "missing" 5
  else                                                warn  "homepage" "$homepage_val" 5
  fi

  # publishConfig
  publish_access=$(json_get "$pkg_path" "publishConfig.access")
  if [ "$publish_access" = "public" ]; then ok    "publishConfig" "access: public" 5
  else                                      error "publishConfig" "missing or not public" 5
  fi

  # exports structure
  exports_nested=$(check_exports_nested "$pkg_path")
  if [ "$exports_nested" = "nested" ]; then    ok    "exports" "nested under '.'" 10
  elif [ "$exports_nested" = "flat" ]; then    error "exports" "flat (should nest under '.')" 10
  elif [ "$exports_nested" = "missing" ]; then error "exports" "missing" 10
  else                                         warn  "exports" "unexpected structure" 10
  fi

  # exports condition order
  exports_order=$(check_exports_order "$pkg_path")
  if [ "$exports_order" = "import-first" ]; then   ok   "exports_order" "import before require" 5
  elif [ "$exports_order" = "require-first" ]; then warn "exports_order" "require before import" 5
  fi

  # files array
  files_val=$(json_get "$pkg_path" "files")
  if [ -z "$files_val" ]; then
    error "files" "missing" 10
  else
    has_md=$(printf '%s' "$files_val" | grep -c '\*\.md' || true)
    if [ "$has_md" -gt 0 ]; then ok   "files" "includes *.md" 10
    else                          warn "files" "missing *.md entry" 10
    fi
  fi

  # scripts.build
  build_script=$(json_get "$pkg_path" "scripts.build")
  if [ -n "$build_script" ]; then ok   "scripts.build" "$build_script" 5
  else                             warn "scripts.build" "missing" 5
  fi

  emit_pkg "$pkg_name" "$pkg_path"
}

if [ $# -gt 0 ]; then
  audit_pkg "$PACKAGES_DIR/$1"
else
  for pkg_dir in "$PACKAGES_DIR"/*/; do
    if grep -q '"private"[[:space:]]*:[[:space:]]*true' "$pkg_dir/package.json" 2>/dev/null; then
      continue
    fi
    audit_pkg "$pkg_dir"
  done
fi

printf '{"repos":[%s],"summary":{"total":%d,"errors":%d,"warnings":%d}}\n' \
  "$REPOS_JSON" "$TOTAL_REPOS" "$TOTAL_ERRORS" "$TOTAL_WARNINGS"

exit "$TOTAL_ERRORS"

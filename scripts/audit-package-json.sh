#!/bin/sh
# Audit package.json fields across all @shellicar library packages
# Checks for required fields, consistency, and conventions

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

ERRORS=0
WARNINGS=0

error() {
  printf "  ${RED}ERROR${NC} %s: %s\n" "$1" "$2"
  ERRORS=$((ERRORS + 1))
}

warn() {
  printf "  ${YELLOW}WARN${NC}  %s: %s\n" "$1" "$2"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  printf "  ${GREEN}OK${NC}    %s: %s\n" "$1" "$2"
}

# Find the package.json for a repo's published package
find_pkg() {
  repo="$1"
  repo_dir="$WORKSPACE_DIR/$repo"

  if [ ! -d "$repo_dir" ]; then
    return 1
  fi

  # Look for packages/*/package.json (monorepo pattern)
  for pkg in "$repo_dir"/packages/*/package.json; do
    if [ -f "$pkg" ]; then
      echo "$pkg"
      return 0
    fi
  done

  # Fallback to root package.json
  if [ -f "$repo_dir/package.json" ]; then
    echo "$repo_dir/package.json"
    return 0
  fi

  return 1
}

# Get a JSON field value using node
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
    if (typeof val === 'object') {
      console.log(JSON.stringify(val));
    } else {
      console.log(val);
    }
  " 2>/dev/null
}

# Get top-level keys in order
json_keys() {
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$1', 'utf8');
    const pkg = JSON.parse(content);
    console.log(Object.keys(pkg).join(','));
  " 2>/dev/null
}

# Check if exports conditions have correct order (import before require)
check_exports_order() {
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$1', 'utf8');
    const pkg = JSON.parse(content);
    const exports = pkg.exports;
    if (!exports) { process.exit(0); }

    // Check if nested under '.'
    const entry = exports['.'] || exports;

    const keys = Object.keys(entry);
    const importIdx = keys.indexOf('import');
    const requireIdx = keys.indexOf('require');

    if (importIdx === -1 || requireIdx === -1) {
      // Only one format, that's fine
      process.exit(0);
    }

    if (importIdx > requireIdx) {
      console.log('require-first');
    } else {
      console.log('import-first');
    }
  " 2>/dev/null
}

# Check for typos in exports
check_exports_typos() {
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$1', 'utf8');
    const pkg = JSON.parse(content);
    const exports = pkg.exports;
    if (!exports) { process.exit(0); }

    function findTypos(obj, path) {
      for (const [key, val] of Object.entries(obj)) {
        const currentPath = path ? path + '.' + key : key;
        if (key === 'typess' || key === 'defualt' || key === 'requrie' || key === 'imoprt') {
          console.log('typo:' + currentPath + ':' + key);
        }
        if (typeof val === 'object' && val !== null) {
          findTypos(val, currentPath);
        }
      }
    }
    findTypos(exports, 'exports');
  " 2>/dev/null
}

# Check if exports are nested under "."
check_exports_nested() {
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$1', 'utf8');
    const pkg = JSON.parse(content);
    const exports = pkg.exports;
    if (!exports) { console.log('missing'); process.exit(0); }

    if (exports['.']) {
      console.log('nested');
    } else if (exports['import'] || exports['require'] || exports['types']) {
      console.log('flat');
    } else {
      console.log('other');
    }
  " 2>/dev/null
}

# Check path prefix convention
check_path_prefix() {
  value="$1"
  if [ -z "$value" ]; then
    return
  fi
  case "$value" in
    ./*) echo "prefixed" ;;
    *) echo "unprefixed" ;;
  esac
}

audit_package() {
  repo="$1"
  pkg_path=$(find_pkg "$repo") || {
    printf "\n${DIM}Skipping %s (not found)${NC}\n" "$repo"
    return
  }

  printf "\n${BLUE}=== %s ===${NC}\n" "$repo"
  printf "  ${DIM}%s${NC}\n" "$pkg_path"

  name=$(json_get "$pkg_path" "name")
  version=$(json_get "$pkg_path" "version")
  printf "  %s@%s\n" "$name" "$version"

  # Required fields
  private_val=$(json_get "$pkg_path" "private")
  if [ "$private_val" = "false" ]; then
    ok "private" "false"
  elif [ -z "$private_val" ]; then
    warn "private" "missing (should be false)"
  else
    error "private" "is '$private_val' (should be false)"
  fi

  type_val=$(json_get "$pkg_path" "type")
  if [ "$type_val" = "module" ]; then
    ok "type" "module"
  else
    error "type" "'$type_val' (should be 'module')"
  fi

  license_val=$(json_get "$pkg_path" "license")
  if [ "$license_val" = "MIT" ]; then
    ok "license" "MIT"
  else
    error "license" "'$license_val' (should be 'MIT')"
  fi

  author_val=$(json_get "$pkg_path" "author")
  if [ "$author_val" = "Stephen Hellicar" ]; then
    ok "author" "Stephen Hellicar"
  elif [ -z "$author_val" ]; then
    error "author" "missing"
  else
    warn "author" "'$author_val' (expected 'Stephen Hellicar')"
  fi

  desc_val=$(json_get "$pkg_path" "description")
  if [ -n "$desc_val" ]; then
    ok "description" "present"
  else
    error "description" "missing or empty"
  fi

  keywords_val=$(json_get "$pkg_path" "keywords")
  if [ -n "$keywords_val" ] && [ "$keywords_val" != "[]" ]; then
    ok "keywords" "present"
  else
    warn "keywords" "missing or empty"
  fi

  # Repository
  repo_url=$(json_get "$pkg_path" "repository.url")
  expected_url="git+https://github.com/shellicar/${repo}.git"
  if [ "$repo_url" = "$expected_url" ]; then
    ok "repository.url" "correct"
  elif [ -z "$repo_url" ]; then
    error "repository.url" "missing (should be '$expected_url')"
  else
    warn "repository.url" "'$repo_url' (expected '$expected_url')"
  fi

  # Bugs
  bugs_url=$(json_get "$pkg_path" "bugs.url")
  expected_bugs="https://github.com/shellicar/${repo}/issues"
  if [ "$bugs_url" = "$expected_bugs" ]; then
    ok "bugs.url" "correct"
  elif [ -z "$bugs_url" ]; then
    error "bugs.url" "missing"
  else
    warn "bugs.url" "'$bugs_url'"
  fi

  # Homepage
  homepage_val=$(json_get "$pkg_path" "homepage")
  expected_homepage="https://github.com/shellicar/${repo}#readme"
  if [ "$homepage_val" = "$expected_homepage" ]; then
    ok "homepage" "correct"
  elif [ -z "$homepage_val" ]; then
    error "homepage" "missing"
  else
    warn "homepage" "'$homepage_val'"
  fi

  # publishConfig
  publish_access=$(json_get "$pkg_path" "publishConfig.access")
  if [ "$publish_access" = "public" ]; then
    ok "publishConfig" "access: public"
  else
    error "publishConfig" "missing or not public"
  fi

  # Exports structure
  exports_nested=$(check_exports_nested "$pkg_path")
  if [ "$exports_nested" = "nested" ]; then
    ok "exports" "nested under '.'"
  elif [ "$exports_nested" = "flat" ]; then
    error "exports" "flat structure (should be nested under '.')"
  elif [ "$exports_nested" = "missing" ]; then
    error "exports" "missing"
  fi

  # Exports typos
  typos=$(check_exports_typos "$pkg_path")
  if [ -n "$typos" ]; then
    echo "$typos" | while IFS= read -r typo; do
      field=$(echo "$typo" | cut -d: -f2)
      value=$(echo "$typo" | cut -d: -f3)
      error "exports" "typo '$value' at $field"
    done
  fi

  # Exports condition order
  exports_order=$(check_exports_order "$pkg_path")
  if [ "$exports_order" = "require-first" ]; then
    warn "exports" "require listed before import (convention: import first)"
  elif [ "$exports_order" = "import-first" ]; then
    ok "exports" "import-first ordering"
  fi

  # Path prefix checks
  main_val=$(json_get "$pkg_path" "main")
  if [ -n "$main_val" ]; then
    prefix=$(check_path_prefix "$main_val")
    if [ "$prefix" = "prefixed" ]; then
      ok "main" "$main_val"
    else
      warn "main" "'$main_val' (should have ./ prefix)"
    fi
  fi

  module_val=$(json_get "$pkg_path" "module")
  if [ -n "$module_val" ]; then
    prefix=$(check_path_prefix "$module_val")
    if [ "$prefix" = "prefixed" ]; then
      ok "module" "$module_val"
    else
      warn "module" "'$module_val' (should have ./ prefix)"
    fi
  fi

  types_val=$(json_get "$pkg_path" "types")
  if [ -n "$types_val" ]; then
    prefix=$(check_path_prefix "$types_val")
    if [ "$prefix" = "prefixed" ]; then
      ok "types" "$types_val"
    else
      warn "types" "'$types_val' (should have ./ prefix)"
    fi
  fi

  # Files array check
  files_val=$(json_get "$pkg_path" "files")
  if [ -z "$files_val" ]; then
    error "files" "missing"
  else
    has_md=$(echo "$files_val" | grep -c '\*\.md' || true)
    if [ "$has_md" -gt 0 ]; then
      ok "files" "includes *.md"
    else
      warn "files" "missing '*.md' entry"
    fi
  fi

  # Scripts check
  dev_script=$(json_get "$pkg_path" "scripts.dev")
  watch_script=$(json_get "$pkg_path" "scripts.watch")
  if [ -n "$dev_script" ]; then
    ok "scripts.dev" "present"
  elif [ -n "$watch_script" ]; then
    warn "scripts" "'watch' script found instead of 'dev'"
  fi

  # Field ordering
  keys=$(json_keys "$pkg_path")
  printf "  ${DIM}field order: %s${NC}\n" "$keys"
}

printf "${BLUE}Package.json Audit${NC}\n"
printf "Conventions: ./ prefix, *.md in files, import-first exports\n"

for repo in $LIBRARY_REPOS; do
  audit_package "$repo"
done

printf "\n${BLUE}=== Summary ===${NC}\n"
if [ $ERRORS -gt 0 ]; then
  printf "${RED}%d errors${NC}" "$ERRORS"
else
  printf "${GREEN}0 errors${NC}"
fi
printf ", "
if [ $WARNINGS -gt 0 ]; then
  printf "${YELLOW}%d warnings${NC}\n" "$WARNINGS"
else
  printf "${GREEN}0 warnings${NC}\n"
fi

exit $ERRORS

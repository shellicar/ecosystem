#!/bin/sh
# Diagnose ecosystem setup: tools, .env, repo accessibility.
# Outputs JSON.
#
# Usage:
#   doctor.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

CHECKS_JSON=""
FIRST=1
PASS=0
FAIL=0

add_check() {
  _name="$1"
  _status="$2"
  _detail="$3"

  _entry=$(printf '{"check":"%s","status":"%s","detail":"%s"}' "$_name" "$_status" "$_detail")

  if [ "$FIRST" = "1" ]; then
    CHECKS_JSON="$_entry"
    FIRST=0
  else
    CHECKS_JSON="${CHECKS_JSON},${_entry}"
  fi

  if [ "$_status" = "ok" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
}

# Required tools
for tool in pnpm node git jq; do
  if command -v "$tool" >/dev/null 2>&1; then
    version=$(eval "$tool --version" 2>/dev/null | head -1 | tr -d '\n')
    add_check "tool:$tool" "ok" "$version"
  else
    add_check "tool:$tool" "missing" "not found in PATH"
  fi
done

# .env file
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  app_count=0
  for _d in $APP_REPOS; do
    app_count=$((app_count + 1))
  done
  add_check "env_file" "ok" "$app_count app repo(s) configured"
else
  add_check "env_file" "missing" "no .env — only @shellicar repos will be audited"
fi

# Script executability
for script in "$SCRIPT_DIR"/*.sh; do
  name=$(basename "$script")
  if [ -x "$script" ]; then
    add_check "script:$name" "ok" "executable"
  else
    add_check "script:$name" "not_executable" "missing +x"
  fi
done

# Repo accessibility
for dir in $ALL_REPO_DIRS; do
  repo=$(basename "$dir")
  if [ -d "$dir/.git" ]; then
    add_check "repo:$repo" "ok" "$dir"
  elif [ -d "$dir" ]; then
    add_check "repo:$repo" "no_git" "$dir exists but no .git"
  else
    add_check "repo:$repo" "missing" "$dir not found"
  fi
done

TOTAL=$((PASS + FAIL))
printf '{"pass":%d,"fail":%d,"total":%d,"checks":[%s]}\n' \
  "$PASS" "$FAIL" "$TOTAL" "$CHECKS_JSON"

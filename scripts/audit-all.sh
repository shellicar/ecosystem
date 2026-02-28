#!/bin/sh
# Run pnpm audit across all @shellicar library repos

SCRIPT_DIR=$(dirname "$0")
. "$SCRIPT_DIR/common.sh"

for repo in $LIBRARY_REPOS; do
  dir="${WORKSPACE_DIR}/${repo}"
  if [ -d "$dir" ]; then
    echo "=== ${repo} ==="
    cd "$dir"
    pnpm audit 2>&1 | tail -n 1
    echo ""
  fi
done

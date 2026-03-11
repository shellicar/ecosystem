#!/bin/sh

set -eu

# Source common definitions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

# Parse arguments
DESTRUCTIVE=false
for arg in "$@"; do
  case "$arg" in
    -d|--destructive) DESTRUCTIVE=true ;;
  esac
done

# Files that should always be synced (overwrite if different)
SYNC_FILES=".markdownlint.json LICENSE .github/workflows scripts .lefthook GitVersion.yml"

# Files that are synced but excluded for certain packages
CONDITIONAL_SYNC_FILES="lefthook.yml"

# Packages that should NOT get conditional sync files
EXCLUDE_CONDITIONAL="reference-foundation reference-enterprise"

# Files that are expected to differ (just report)
EXPECTED_DIFF_FILES=".syncpackrc turbo.json pnpm-workspace.yaml biome.json"

cd "$SCRIPT_DIR/../files/"
for j in $LIBRARY_REPOS; do
  target_dir="../../$j"

  if [ -d "$target_dir" ]; then
    printf "${GREEN}Checking${RESET} %s...\n" "$j"

    # Sync files - copy if different
    for file in $SYNC_FILES; do
      if [ -d "$file" ]; then
        # Handle directories with rsync
        mkdir -p "$target_dir/$file"
        if [ "$DESTRUCTIVE" = true ]; then
          # Destructive mode: sync and delete orphaned files
          changes=$(rsync --archive --verbose --delete "$file/" "$target_dir/$file/" 2>/dev/null | tail -n +2 | head -n -3)
          # Show what was deleted
          echo "$changes" | grep "^deleting " | while read -r line; do
            deleted_file=$(echo "$line" | sed 's/^deleting //')
            printf "${RED}  DELETED:${RESET} %s/%s\n" "$file" "$deleted_file"
          done
        else
          # Non-destructive: first show what would be deleted (warning only)
          would_delete=$(rsync --archive --verbose --dry-run --delete "$file/" "$target_dir/$file/" 2>/dev/null | grep "^deleting " || true)
          if [ -n "$would_delete" ]; then
            echo "$would_delete" | while read -r line; do
              deleted_file=$(echo "$line" | sed 's/^deleting //')
              printf "${RED}  ORPHANED:${RESET} %s/%s (use -d to delete)\n" "$file" "$deleted_file"
            done
          fi
          # Then actually sync without deletions
          changes=$(rsync --archive --verbose "$file/" "$target_dir/$file/" 2>/dev/null | tail -n +2 | head -n -3)
        fi
        if [ -n "$changes" ]; then
          printf "${YELLOW}  SYNCING DIR:${RESET} %s\n" "$file"
        fi
      elif [ -f "$file" ]; then
        # Handle regular files
        if [ -f "$target_dir/$file" ]; then
          if ! diff -q "$file" "$target_dir/$file" >/dev/null 2>&1; then
            echo "  SYNCING: $file"
            cp "$file" "$target_dir/$file"
          fi
        else
          echo "  NEW SYNC: $file"
          mkdir -p "$(dirname "$target_dir/$file")"
          cp "$file" "$target_dir/$file"
        fi
      fi
    done

    # Handle conditional sync files
    for file in $CONDITIONAL_SYNC_FILES; do
      # Check if this package should be excluded
      exclude=false
      for exclude_pkg in $EXCLUDE_CONDITIONAL; do
        if [ "$j" = "$exclude_pkg" ]; then
          exclude=true
          break
        fi
      done

      if [ "$exclude" = false ]; then
        if [ -f "$file" ] && [ -f "$target_dir/$file" ]; then
          if ! diff -q "$file" "$target_dir/$file" >/dev/null 2>&1; then
            echo "  SYNCING: $file"
            cp "$file" "$target_dir/$file"
          fi
        elif [ -f "$file" ]; then
          echo "  NEW SYNC: $file"
          cp "$file" "$target_dir/$file"
        fi
      fi
    done

    # Report other differences
    find . -type f | while read -r file; do
      target_file="$target_dir/$file"
      file_basename=$(basename "$file")

      # Skip sync files (already handled)
      skip=false
      for sync_file in $SYNC_FILES; do
        if [ "$file" = "./$sync_file" ]; then
          skip=true
          break
        fi
      done

      # Skip conditional sync files (already handled)
      if [ "$skip" = false ]; then
        for sync_file in $CONDITIONAL_SYNC_FILES; do
          if [ "$file" = "./$sync_file" ]; then
            skip=true
            break
          fi
        done
      fi

      if [ "$skip" = false ]; then
        if [ -f "$target_file" ]; then
          if ! diff -q "$file" "$target_file" >/dev/null 2>&1; then
            # Check if this is an expected diff
            expected=false
            for expected_file in $EXPECTED_DIFF_FILES; do
              if [ "$file" = "./$expected_file" ]; then
                expected=true
                break
              fi
            done

            if [ "$expected" = true ]; then
              printf "${BLUE}  DIFF (expected):${RESET} %s\n" "$file"
            else
              printf "${RED}  DIFF:${RESET} %s\n" "$file"
            fi
          fi
        else
          echo "  NEW: $file"
          mkdir -p "$(dirname "$target_file")"
          cp "$file" "$target_file"
        fi
      fi
    done
  else
    echo "Copying to new directory: $j"
    cp -r . "$target_dir/"
  fi
done

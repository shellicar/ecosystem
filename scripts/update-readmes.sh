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

readonly MARKER_BEGIN='<!-- BEGIN_ECOSYSTEM -->'
readonly MARKER_END='<!-- END_ECOSYSTEM -->'

update_single_readme() {
  local readme_path=$1
  local ecosystem_content
  local new_content
  local between_markers=false

  ecosystem_content=$(cat ecosystem.md)
  new_content=$(mktemp)

  while IFS= read -r line; do
    case "$line" in
    *"$MARKER_BEGIN"*)
      echo "$line" >>"$new_content"
      echo "" >>"$new_content"
      echo "$ecosystem_content" >>"$new_content"
      echo "" >>"$new_content"
      between_markers=true
      ;;
    *"$MARKER_END"*)
      echo "$line" >>"$new_content"
      between_markers=false
      ;;
    *)
      [ "$between_markers" = false ] && echo "$line" >>"$new_content"
      ;;
    esac
  done <"$readme_path"

  mv "$new_content" "$readme_path"
}

find -L .. -maxdepth 2 -name README.md -type f | while read -r readme_path; do
  printf "${GREEN}Processing${RESET} %s...\n" "$readme_path"

  if ! grep -q "$MARKER_BEGIN" "$readme_path"; then
    printf "${YELLOW}Skipping${RESET} %s - no ecosystem markers found\n" "$readme_path"
    continue
  fi

  current_section=$(sed -n "/$MARKER_BEGIN/,/$MARKER_END/p" "$readme_path")
  expected_section=$(printf "%s\n\n%s\n\n%s" "$MARKER_BEGIN" "$(cat ecosystem.md)" "$MARKER_END")

  if [ "$current_section" = "$expected_section" ]; then
    printf "${BLUE}No changes needed${RESET} for %s\n" "$readme_path"
    continue
  fi

  if [ "$DESTRUCTIVE" = true ]; then
    update_single_readme "$readme_path"
    printf "${GREEN}Updated${RESET} %s successfully\n" "$readme_path"
  else
    printf "${RED}WOULD UPDATE${RESET} %s (use -d to apply)\n" "$readme_path"
  fi
done

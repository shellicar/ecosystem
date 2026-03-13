#!/bin/sh

# Sync GitHub repository settings across all @shellicar repos
# Ensures consistent configuration for all repositories
#
# Usage: sync-settings.sh [-d|--destructive]
#   By default runs in dry-run mode (no changes made)
#   Use -d or --destructive to actually apply settings

# Source common definitions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

OWNER="$GITHUB_OWNER"
DRY_RUN=true

# =============================================================================
# REPO CATEGORIES
# =============================================================================
# LIBRARY_REPOS is defined in common (published npm packages)

REFERENCE_REPOS="reference-enterprise
reference-foundation"

CONFIG_REPOS="ecosystem"

# =============================================================================
# SETTINGS BY CATEGORY
# =============================================================================
# Format: auto_merge delete_branch wiki projects discussions issues

# Published npm packages - full features
LIBRARY_SETTINGS="true true false false false true"

# Reference/template repos
REFERENCE_SETTINGS="true true false false false true"

# Config/meta repos (ecosystem, etc.)
CONFIG_SETTINGS="true true false false false false"

# =============================================================================
# FUNCTIONS
# =============================================================================

# Check if repo is in a list
# Usage: in_list <repo> <list>
in_list() {
  repo="$1"
  list="$2"
  echo "$list" | grep -qw "$repo"
}

# Get settings for a repo based on its category
# Usage: get_repo_settings <repo>
# Sets: WANT_AUTO_MERGE, WANT_DELETE_BRANCH, WANT_WIKI, WANT_PROJECTS, WANT_DISCUSSIONS, WANT_ISSUES
get_repo_settings() {
  repo="$1"

  if in_list "$repo" "$CONFIG_REPOS"; then
    settings="$CONFIG_SETTINGS"
  elif in_list "$repo" "$REFERENCE_REPOS"; then
    settings="$REFERENCE_SETTINGS"
  elif in_list "$repo" "$LIBRARY_REPOS"; then
    settings="$LIBRARY_SETTINGS"
  else
    # Unknown repo - use library defaults
    settings="$LIBRARY_SETTINGS"
  fi

  # Parse settings string
  WANT_AUTO_MERGE=$(echo "$settings" | cut -d' ' -f1)
  WANT_DELETE_BRANCH=$(echo "$settings" | cut -d' ' -f2)
  WANT_WIKI=$(echo "$settings" | cut -d' ' -f3)
  WANT_PROJECTS=$(echo "$settings" | cut -d' ' -f4)
  WANT_DISCUSSIONS=$(echo "$settings" | cut -d' ' -f5)
  WANT_ISSUES=$(echo "$settings" | cut -d' ' -f6)
}

# Get current repo settings from GitHub API
# Usage: fetch_current_settings <repo>
# Returns: JSON with current settings
fetch_current_settings() {
  repo="$1"
  gh api "repos/$OWNER/$repo" --jq '{
    auto_merge: .allow_auto_merge,
    delete_branch: .delete_branch_on_merge,
    wiki: .has_wiki,
    projects: .has_projects,
    discussions: .has_discussions,
    issues: .has_issues
  }' 2>/dev/null
}

# Parse a boolean from JSON
# Usage: parse_bool <json> <key>
parse_bool() {
  json="$1"
  key="$2"
  echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d':' -f2 | tr -d ' '
}

# Check if current settings match wanted settings
# Usage: settings_match <json>
# Returns: 0 if match, 1 if not
settings_match() {
  json="$1"

  current_auto_merge=$(parse_bool "$json" "auto_merge")
  current_delete_branch=$(parse_bool "$json" "delete_branch")
  current_wiki=$(parse_bool "$json" "wiki")
  current_projects=$(parse_bool "$json" "projects")
  current_discussions=$(parse_bool "$json" "discussions")
  current_issues=$(parse_bool "$json" "issues")

  [ "$current_auto_merge" = "$WANT_AUTO_MERGE" ] &&
    [ "$current_delete_branch" = "$WANT_DELETE_BRANCH" ] &&
    [ "$current_wiki" = "$WANT_WIKI" ] &&
    [ "$current_projects" = "$WANT_PROJECTS" ] &&
    [ "$current_discussions" = "$WANT_DISCUSSIONS" ] &&
    [ "$current_issues" = "$WANT_ISSUES" ]
}

# Format settings for display
# Usage: format_settings <auto_merge> <delete_branch> <wiki> <projects> <discussions> <issues>
format_settings() {
  printf "auto_merge=%s delete_branch=%s wiki=%s projects=%s discussions=%s issues=%s" "$1" "$2" "$3" "$4" "$5" "$6"
}

# Apply settings to a repo (respects DRY_RUN)
# Usage: apply_settings <repo> <current_formatted>
apply_settings() {
  repo="$1"
  current="$2"

  wanted=$(format_settings "$WANT_AUTO_MERGE" "$WANT_DELETE_BRANCH" "$WANT_WIKI" "$WANT_PROJECTS" "$WANT_DISCUSSIONS" "$WANT_ISSUES")

  # Build gh repo edit flags
  if [ "$WANT_AUTO_MERGE" = "true" ]; then
    auto_merge_flag="--enable-auto-merge"
  else
    auto_merge_flag="--disable-auto-merge"
  fi

  if [ "$WANT_DELETE_BRANCH" = "true" ]; then
    delete_branch_flag="--delete-branch-on-merge"
  else
    delete_branch_flag="--delete-branch-on-merge=false"
  fi

  if [ "$DRY_RUN" = true ]; then
    printf "${YELLOW}Would update${NC}\n"
    echo "  Current: $current"
    echo "  Target:  $wanted"
  else
    result=$(gh repo edit "$OWNER/$repo" \
      $auto_merge_flag \
      $delete_branch_flag \
      --enable-wiki=$WANT_WIKI \
      --enable-projects=$WANT_PROJECTS \
      --enable-discussions=$WANT_DISCUSSIONS \
      --enable-issues=$WANT_ISSUES 2>&1)

    if [ $? -eq 0 ]; then
      printf "${YELLOW}Updated${NC}\n"
      echo "  Was: $current"
    else
      printf "${RED}Failed to update${NC}\n"
      echo "  $result"
    fi
  fi
}

# =============================================================================
# MAIN
# =============================================================================

# Parse arguments
while [ $# -gt 0 ]; do
  case $1 in
  -d | --destructive)
    DRY_RUN=false
    shift
    ;;
  -h | --help)
    echo "Usage: sync-settings.sh [-d|--destructive]"
    echo "  By default runs in dry-run mode (no changes made)"
    echo "  Use -d or --destructive to actually apply settings"
    echo ""
    echo "Settings by category (auto_merge wiki projects discussions issues):"
    echo ""
    echo "  Library repos:   $LIBRARY_SETTINGS"
    echo "  Reference repos: $REFERENCE_SETTINGS"
    echo "  Config repos:    $CONFIG_SETTINGS"
    exit 0
    ;;
  *)
    echo "Unknown option: $1"
    exit 1
    ;;
  esac
done

echo "Syncing repository settings across @shellicar repos..."
if [ "$DRY_RUN" = true ]; then
  printf "${DIM}(dry-run mode - use -d to make changes)${NC}\n"
fi
echo ""

for repo in $ALL_REPOS; do
  printf "%s: " "$repo"

  # Get wanted settings for this repo
  get_repo_settings "$repo"

  # Fetch current settings from GitHub
  current_json=$(fetch_current_settings "$repo")

  if [ -z "$current_json" ]; then
    printf "${RED}Could not fetch settings${NC}\n"
    continue
  fi

  if settings_match "$current_json"; then
    printf "${BLUE}Up to date${NC}\n"
  else
    current_auto_merge=$(parse_bool "$current_json" "auto_merge")
    current_delete_branch=$(parse_bool "$current_json" "delete_branch")
    current_wiki=$(parse_bool "$current_json" "wiki")
    current_projects=$(parse_bool "$current_json" "projects")
    current_discussions=$(parse_bool "$current_json" "discussions")
    current_issues=$(parse_bool "$current_json" "issues")
    current_formatted=$(format_settings "$current_auto_merge" "$current_delete_branch" "$current_wiki" "$current_projects" "$current_discussions" "$current_issues")

    apply_settings "$repo" "$current_formatted"
  fi
done

echo ""
echo "Done."

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
# Format: auto_merge delete_branch wiki projects discussions issues pr_policy secret_scanning secret_scan_push dependabot_updates

# Published npm packages - full features
LIBRARY_SETTINGS="true true false false false true collaborators_only enabled enabled disabled"

# Reference/template repos
REFERENCE_SETTINGS="true true false false false true collaborators_only enabled enabled disabled"

# Config/meta repos (ecosystem, etc.)
CONFIG_SETTINGS="true true false false false false collaborators_only enabled enabled disabled"

# Vulnerability alerts - enabled for all repos (alerts only, no auto PRs)
WANT_VULNERABILITY_ALERTS="enabled"

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
# Sets: WANT_AUTO_MERGE, WANT_DELETE_BRANCH, WANT_WIKI, WANT_PROJECTS,
#       WANT_DISCUSSIONS, WANT_ISSUES, WANT_PR_POLICY,
#       WANT_SECRET_SCANNING, WANT_SECRET_SCAN_PUSH, WANT_DEPENDABOT_UPDATES
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
  WANT_PR_POLICY=$(echo "$settings" | cut -d' ' -f7)
  WANT_SECRET_SCANNING=$(echo "$settings" | cut -d' ' -f8)
  WANT_SECRET_SCAN_PUSH=$(echo "$settings" | cut -d' ' -f9)
  WANT_DEPENDABOT_UPDATES=$(echo "$settings" | cut -d' ' -f10)
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
    issues: .has_issues,
    pr_policy: .pull_request_creation_policy,
    secret_scanning: .security_and_analysis.secret_scanning.status,
    secret_scan_push: .security_and_analysis.secret_scanning_push_protection.status,
    dependabot_updates: .security_and_analysis.dependabot_security_updates.status
  }' 2>/dev/null
}

# Get vulnerability alerts status for a repo
# Usage: fetch_vulnerability_alerts <repo>
# Returns: "enabled" or "disabled"
fetch_vulnerability_alerts() {
  repo="$1"
  response=$(gh api "repos/$OWNER/$repo/vulnerability-alerts" -i 2>/dev/null | head -1)
  if echo "$response" | grep -q "204"; then
    echo "enabled"
  else
    echo "disabled"
  fi
}

# Parse a value from compact JSON (handles booleans and strings)
# Usage: parse_value <json> <key>
parse_value() {
  json="$1"
  key="$2"
  echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d':' -f2 | tr -d ' "'
}

# Check if current settings match wanted settings
# Usage: settings_match <json>
# Returns: 0 if match, 1 if not
settings_match() {
  json="$1"

  [ "$(parse_value "$json" "auto_merge")"         = "$WANT_AUTO_MERGE" ] &&
  [ "$(parse_value "$json" "delete_branch")"      = "$WANT_DELETE_BRANCH" ] &&
  [ "$(parse_value "$json" "wiki")"               = "$WANT_WIKI" ] &&
  [ "$(parse_value "$json" "projects")"           = "$WANT_PROJECTS" ] &&
  [ "$(parse_value "$json" "discussions")"        = "$WANT_DISCUSSIONS" ] &&
  [ "$(parse_value "$json" "issues")"             = "$WANT_ISSUES" ] &&
  [ "$(parse_value "$json" "pr_policy")"          = "$WANT_PR_POLICY" ] &&
  [ "$(parse_value "$json" "secret_scanning")"    = "$WANT_SECRET_SCANNING" ] &&
  [ "$(parse_value "$json" "secret_scan_push")"   = "$WANT_SECRET_SCAN_PUSH" ] &&
  [ "$(parse_value "$json" "dependabot_updates")" = "$WANT_DEPENDABOT_UPDATES" ]
}

# Format settings for display
# Usage: format_settings <auto_merge> <delete_branch> <wiki> <projects> <discussions> <issues> <pr_policy> <secret_scanning> <secret_scan_push> <dependabot_updates>
format_settings() {
  printf "auto_merge=%s delete_branch=%s wiki=%s projects=%s discussions=%s issues=%s pr_policy=%s secret_scanning=%s secret_scan_push=%s dependabot_updates=%s" \
    "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "${10}"
}

# Apply settings to a repo (respects DRY_RUN)
# Usage: apply_settings <repo> <current_formatted>
apply_settings() {
  repo="$1"
  current="$2"

  wanted=$(format_settings "$WANT_AUTO_MERGE" "$WANT_DELETE_BRANCH" "$WANT_WIKI" "$WANT_PROJECTS" "$WANT_DISCUSSIONS" "$WANT_ISSUES" "$WANT_PR_POLICY" "$WANT_SECRET_SCANNING" "$WANT_SECRET_SCAN_PUSH" "$WANT_DEPENDABOT_UPDATES")

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
    # Apply basic settings via gh repo edit
    result=$(gh repo edit "$OWNER/$repo" \
      $auto_merge_flag \
      $delete_branch_flag \
      --enable-wiki=$WANT_WIKI \
      --enable-projects=$WANT_PROJECTS \
      --enable-discussions=$WANT_DISCUSSIONS \
      --enable-issues=$WANT_ISSUES 2>&1)

    if [ $? -ne 0 ]; then
      printf "${RED}Failed to update basic settings${NC}\n"
      echo "  $result"
      return 1
    fi

    # Apply pull_request_creation_policy and security settings via PATCH
    patch_json=$(printf '{"pull_request_creation_policy":"%s","security_and_analysis":{"secret_scanning":{"status":"%s"},"secret_scanning_push_protection":{"status":"%s"}}}' \
      "$WANT_PR_POLICY" "$WANT_SECRET_SCANNING" "$WANT_SECRET_SCAN_PUSH")

    result=$(echo "$patch_json" | gh api "repos/$OWNER/$repo" --method PATCH --input - 2>&1)
    if [ $? -ne 0 ]; then
      printf "${RED}Failed to update API settings${NC}\n"
      echo "  $result"
      return 1
    fi

    # Apply dependabot security updates (automated-security-fixes)
    if [ "$WANT_DEPENDABOT_UPDATES" = "enabled" ]; then
      gh api "repos/$OWNER/$repo/automated-security-fixes" --method PUT >/dev/null 2>&1
    else
      gh api "repos/$OWNER/$repo/automated-security-fixes" --method DELETE >/dev/null 2>&1
    fi

    printf "${YELLOW}Updated${NC}\n"
    echo "  Was: $current"
  fi
}

# Apply vulnerability alerts setting (respects DRY_RUN)
# Usage: apply_vulnerability_alerts <repo> <current>
apply_vulnerability_alerts() {
  repo="$1"
  current="$2"

  if [ "$DRY_RUN" = true ]; then
    echo "  vulnerability_alerts: $current → $WANT_VULNERABILITY_ALERTS (would update)"
  else
    if [ "$WANT_VULNERABILITY_ALERTS" = "enabled" ]; then
      gh api "repos/$OWNER/$repo/vulnerability-alerts" --method PUT >/dev/null 2>&1
    else
      gh api "repos/$OWNER/$repo/vulnerability-alerts" --method DELETE >/dev/null 2>&1
    fi
    echo "  vulnerability_alerts: $current → $WANT_VULNERABILITY_ALERTS"
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
    echo "Settings by category (auto_merge delete_branch wiki projects discussions issues pr_policy secret_scanning secret_scan_push dependabot_updates):"
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

  # Fetch vulnerability alerts (separate endpoint)
  current_vuln=$(fetch_vulnerability_alerts "$repo")
  vuln_ok=true
  [ "$current_vuln" != "$WANT_VULNERABILITY_ALERTS" ] && vuln_ok=false

  if settings_match "$current_json" && [ "$vuln_ok" = true ]; then
    printf "${BLUE}Up to date${NC}\n"
  else
    current_formatted=$(format_settings \
      "$(parse_value "$current_json" "auto_merge")" \
      "$(parse_value "$current_json" "delete_branch")" \
      "$(parse_value "$current_json" "wiki")" \
      "$(parse_value "$current_json" "projects")" \
      "$(parse_value "$current_json" "discussions")" \
      "$(parse_value "$current_json" "issues")" \
      "$(parse_value "$current_json" "pr_policy")" \
      "$(parse_value "$current_json" "secret_scanning")" \
      "$(parse_value "$current_json" "secret_scan_push")" \
      "$(parse_value "$current_json" "dependabot_updates")")

    if ! settings_match "$current_json"; then
      apply_settings "$repo" "$current_formatted"
    else
      # Only vulnerability alerts differ
      if [ "$DRY_RUN" = true ]; then
        printf "${YELLOW}Would update${NC}\n"
      else
        printf "${YELLOW}Updated${NC}\n"
      fi
    fi

    if [ "$vuln_ok" = false ]; then
      apply_vulnerability_alerts "$repo" "$current_vuln"
    fi
  fi
done

echo ""
echo "Done."

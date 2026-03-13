#!/bin/sh

# Sync GitHub rulesets across all @shellicar repos
# Creates or updates rulesets to match the standard 6-rule configuration
#
# Usage: sync-rulesets.sh [-d|--destructive]
#   By default runs in dry-run mode (no changes made)
#   Use -d or --destructive to actually create/update rulesets

# Source common definitions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common"

OWNER="$GITHUB_OWNER"
DRY_RUN=true

# Standard rules (sorted for comparison)
# Note: 'update' rule removed - it blocks PR merges when no bypass actors are configured
EXPECTED_RULES='["code_scanning","creation","deletion","non_fast_forward","pull_request","required_status_checks"]'

# Simplified rules for config repos
SIMPLE_EXPECTED_RULES='["creation","deletion","non_fast_forward","pull_request"]'

# Standard ruleset configuration
RULESET_JSON='{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "exclude": [],
      "include": ["~DEFAULT_BRANCH"]
    }
  },
  "rules": [
    {"type": "creation"},
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "code_scanning", "parameters": {"code_scanning_tools": [{"tool": "CodeQL", "security_alerts_threshold": "high_or_higher", "alerts_threshold": "errors"}]}},
    {"type": "pull_request", "parameters": {"required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false, "required_reviewers": [], "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false, "allowed_merge_methods": ["squash"]}},
    {"type": "required_status_checks", "parameters": {"strict_required_status_checks_policy": true, "do_not_enforce_on_create": true, "required_status_checks": [{"context": "build (22.x)", "integration_id": 15368}]}}
  ]
}'

# Simplified ruleset for config repos (no code_scanning or build checks)
SIMPLE_RULESET_JSON='{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "exclude": [],
      "include": ["~DEFAULT_BRANCH"]
    }
  },
  "rules": [
    {"type": "creation"},
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "pull_request", "parameters": {"required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false, "required_reviewers": [], "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false, "allowed_merge_methods": ["squash"]}}
  ]
}'

# Check if repo is a config repo
is_config_repo() {
  repo="$1"
  echo "$CONFIG_REPOS" | grep -qw "$repo"
}

# Get the appropriate ruleset JSON for a repo
get_ruleset_json() {
  repo="$1"
  if is_config_repo "$repo"; then
    echo "$SIMPLE_RULESET_JSON"
  else
    echo "$RULESET_JSON"
  fi
}

# Get the expected rules for a repo
get_expected_rules() {
  repo="$1"
  if is_config_repo "$repo"; then
    echo "$SIMPLE_EXPECTED_RULES"
  else
    echo "$EXPECTED_RULES"
  fi
}

# List all rulesets for a repo
# Usage: list_rulesets <repo>
# Returns: JSON array of rulesets (or empty)
list_rulesets() {
  repo="$1"
  gh api "repos/$OWNER/$repo/rulesets" 2>/dev/null
}

# Get details of a specific ruleset
# Usage: get_ruleset <repo> <ruleset_id>
# Returns: JSON object with full ruleset details
get_ruleset() {
  repo="$1"
  ruleset_id="$2"
  gh api "repos/$OWNER/$repo/rulesets/$ruleset_id" 2>/dev/null
}

# Create a new ruleset (respects DRY_RUN)
# Usage: create_ruleset <repo>
# Outputs status message
create_ruleset() {
  repo="$1"
  ruleset_json=$(get_ruleset_json "$repo")
  if [ "$DRY_RUN" = true ]; then
    printf "${GREEN}Would create${NC}\n"
  else
    result=$(echo "$ruleset_json" | gh api "repos/$OWNER/$repo/rulesets" -X POST --input - 2>&1)
    if [ $? -eq 0 ]; then
      printf "${GREEN}Created${NC}\n"
    else
      printf "${RED}Failed to create${NC}\n"
      echo "  $result"
    fi
  fi
}

# Update an existing ruleset (respects DRY_RUN)
# Usage: update_ruleset <repo> <ruleset_id> <current_rules>
# Outputs status message
update_ruleset() {
  repo="$1"
  ruleset_id="$2"
  current_rules="$3"
  ruleset_json=$(get_ruleset_json "$repo")
  if [ "$DRY_RUN" = true ]; then
    printf "${YELLOW}Would update${NC} (ID: %s)\n" "$ruleset_id"
    echo "  Current: $current_rules"
  else
    result=$(echo "$ruleset_json" | gh api "repos/$OWNER/$repo/rulesets/$ruleset_id" -X PUT --input - 2>&1)
    if [ $? -eq 0 ]; then
      printf "${YELLOW}Updated${NC} (ID: %s)\n" "$ruleset_id"
      echo "  Was: $current_rules"
    else
      printf "${RED}Failed to update${NC}\n"
      echo "  $result"
    fi
  fi
}

# Extract ruleset ID from list response
# Usage: parse_ruleset_id <json>
# Returns: ruleset ID or empty
parse_ruleset_id() {
  json="$1"
  echo "$json" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2
}

# Extract and sort rule types from ruleset details
# Usage: parse_rule_types <json>
# Returns: sorted JSON array of rule types
parse_rule_types() {
  json="$1"
  echo "$json" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g;s/"//g' | sort | tr '\n' ',' | sed 's/,$//' | sed 's/^/["/;s/,/","/g;s/$/"]/'
}

# Parse arguments
while [ $# -gt 0 ]; do
  case $1 in
  -d | --destructive)
    DRY_RUN=false
    shift
    ;;
  -h | --help)
    echo "Usage: sync-rulesets.sh [-d|--destructive]"
    echo "  By default runs in dry-run mode (no changes made)"
    echo "  Use -d or --destructive to actually create/update rulesets"
    exit 0
    ;;
  *)
    echo "Unknown option: $1"
    exit 1
    ;;
  esac
done

echo "Syncing rulesets across @shellicar repos..."
if [ "$DRY_RUN" = true ]; then
  printf "${DIM}(dry-run mode - use -d to make changes)${NC}\n"
fi
echo ""

for repo in $ALL_REPOS; do
  printf "%s: " "$repo"

  existing=$(list_rulesets "$repo")

  if [ -z "$existing" ] || [ "$existing" = "[]" ]; then
    create_ruleset "$repo"
  else
    ruleset_id=$(parse_ruleset_id "$existing")

    if [ -n "$ruleset_id" ]; then
      details=$(get_ruleset "$repo" "$ruleset_id")
      current_rules=$(parse_rule_types "$details")
      expected_rules=$(get_expected_rules "$repo")

      if [ "$current_rules" = "$expected_rules" ]; then
        printf "${BLUE}Up to date${NC} (ID: %s)\n" "$ruleset_id"
      else
        update_ruleset "$repo" "$ruleset_id" "$current_rules"
      fi
    else
      printf "${RED}Could not parse ruleset ID${NC}\n"
    fi
  fi
done

echo ""
echo "Done."

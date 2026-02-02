#!/bin/sh

# Check for work-in-progress across all repos
# Shows repos with commits NEWER than origin/main (by date, handles squash merges)
# Shows additions/removals for both committed and uncommitted changes

# Source common definitions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

echo "Checking for work-in-progress in @shellicar repos..."
echo ""

# Collect results
active_wip=""
security_wip=""
uncommitted_only=""
stale_branches=""

for dir in "$WORKSPACE_DIR"/*/; do
  # Skip if not a git repo
  if [ ! -d "$dir/.git" ]; then
    continue
  fi

  repo_name=$(basename "$dir")

  cd "$dir" || continue

  # Fetch quietly
  git fetch origin --quiet 2>/dev/null

  # Determine default branch (main or master)
  default_branch="main"
  if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
    if git rev-parse --verify origin/master >/dev/null 2>&1; then
      default_branch="master"
    else
      printf "${YELLOW}%s${NC}: No origin/main or origin/master found\n" "$repo_name"
      continue
    fi
  fi

  current_branch=$(git branch --show-current)

  # Check for uncommitted changes and get stats
  uncommitted_files=$(git status --porcelain 2>/dev/null)
  has_uncommitted=""
  uncommitted_stats=""
  staged_stats=""
  if [ -n "$uncommitted_files" ]; then
    has_uncommitted=" ${RED}(uncommitted)${NC}"
    # Get additions/deletions for uncommitted changes
    uncommitted_stats=$(git diff --shortstat 2>/dev/null)
    staged_stats=$(git diff --cached --shortstat 2>/dev/null)
  fi

  # Get the timestamp of the latest commit on origin/main
  main_timestamp=$(git log -1 --format=%ct "origin/$default_branch" 2>/dev/null)

  # Find commits on HEAD that are NEWER than origin/main's latest commit
  commits_after_main=""
  git log HEAD --format="%ct %h %s" 2>/dev/null | while IFS= read -r line; do
    ts=$(echo "$line" | cut -d' ' -f1)
    rest=$(echo "$line" | cut -d' ' -f2-)
    if [ -n "$ts" ] && [ "$ts" -gt "$main_timestamp" ] 2>/dev/null; then
      echo "$rest"
    fi
  done >/tmp/commits_after_main_$$
  commits_after_main=$(cat /tmp/commits_after_main_$$ 2>/dev/null)
  rm -f /tmp/commits_after_main_$$

  # Count commits
  if [ -n "$commits_after_main" ]; then
    commits_count=$(echo "$commits_after_main" | wc -l | tr -d ' ')
  else
    commits_count=0
  fi

  # Get committed diff from origin/main to HEAD
  committed_stats=$(git diff "origin/$default_branch" HEAD --shortstat 2>/dev/null)

  # Check if on a stale branch (not main/master, no new commits)
  is_stale_branch=""
  if [ "$current_branch" != "$default_branch" ] && [ "$commits_count" -eq 0 ]; then
    is_stale_branch="true"
  fi

  # Build output for this repo
  output=""
  if [ "$commits_count" -gt 0 ] || [ -n "$has_uncommitted" ] || [ -n "$is_stale_branch" ]; then
    output="${BLUE}${repo_name}${NC} [${YELLOW}${current_branch}${NC}]${has_uncommitted}
"

    if [ "$commits_count" -gt 0 ]; then
      output="${output}  ${GREEN}${commits_count} new commits${NC}: ${committed_stats}
"
    elif [ -n "$is_stale_branch" ]; then
      output="${output}  ${DIM}(stale branch - switch to ${default_branch})${NC}
"
    fi

    if [ -n "$uncommitted_stats" ]; then
      output="${output}  ${RED}Unstaged${NC}: ${uncommitted_stats}
"
    fi
    if [ -n "$staged_stats" ]; then
      output="${output}  ${YELLOW}Staged${NC}: ${staged_stats}
"
    fi
    output="${output}
"

    # Categorize
    if [ "$commits_count" -gt 0 ]; then
      # Has new work - check if security/dependabot branch
      case "$current_branch" in
      security* | dependabot*)
        security_wip="${security_wip}${output}"
        ;;
      *)
        active_wip="${active_wip}${output}"
        ;;
      esac
    elif [ -n "$is_stale_branch" ]; then
      # No new work, on old branch - needs cleanup
      stale_branches="${stale_branches}${output}"
    elif [ -n "$has_uncommitted" ]; then
      # On main but has uncommitted changes
      uncommitted_only="${uncommitted_only}${output}"
    fi
  fi
done

# Print in priority order
if [ -n "$active_wip" ]; then
  printf "${GREEN}=== Active Work ===${NC}\n\n"
  printf "%b" "$active_wip"
fi

if [ -n "$uncommitted_only" ]; then
  printf "${YELLOW}=== Uncommitted / Stale Branches ===${NC}\n\n"
  printf "%b" "$uncommitted_only"
fi

if [ -n "$stale_branches" ]; then
  printf "${DIM}=== Stale Branches (switch to main) ===${NC}\n\n"
  printf "%b" "$stale_branches"
fi

if [ -n "$security_wip" ]; then
  printf "${DIM}=== Security/Dependabot ===${NC}\n\n"
  printf "%b" "$security_wip"
fi

echo "Done."

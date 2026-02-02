#!/bin/bash

# Check for work-in-progress across all repos
# Shows repos with commits NEWER than origin/main (by date, handles squash merges)
# Shows additions/removals for both committed and uncommitted changes

WORKSPACE_DIR="/home/stephen/repos/@shellicar"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo "Checking for work-in-progress in @shellicar repos..."
echo ""

# Collect results
active_wip=""
security_wip=""
uncommitted_only=""
stale_branches=""

for dir in "$WORKSPACE_DIR"/*/; do
    # Skip if not a git repo
    if [[ ! -d "$dir/.git" ]]; then
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
            echo -e "${YELLOW}$repo_name${NC}: No origin/main or origin/master found"
            continue
        fi
    fi

    current_branch=$(git branch --show-current)

    # Check for uncommitted changes and get stats
    uncommitted_files=$(git status --porcelain 2>/dev/null)
    has_uncommitted=""
    uncommitted_stats=""
    staged_stats=""
    if [[ -n "$uncommitted_files" ]]; then
        has_uncommitted=" ${RED}(uncommitted)${NC}"
        # Get additions/deletions for uncommitted changes
        uncommitted_stats=$(git diff --shortstat 2>/dev/null)
        staged_stats=$(git diff --cached --shortstat 2>/dev/null)
    fi

    # Get the timestamp of the latest commit on origin/main
    main_timestamp=$(git log -1 --format=%ct "origin/$default_branch" 2>/dev/null)

    # Find commits on HEAD that are NEWER than origin/main's latest commit
    commits_after_main=""
    while IFS= read -r line; do
        ts=$(echo "$line" | cut -d' ' -f1)
        rest=$(echo "$line" | cut -d' ' -f2-)
        if [[ -n "$ts" ]] && [[ $ts -gt $main_timestamp ]]; then
            commits_after_main+="$rest"$'\n'
        fi
    done < <(git log HEAD --format="%ct %h %s" 2>/dev/null)

    # Remove trailing newline and count
    commits_after_main=$(echo -n "$commits_after_main" | sed '/^$/d')
    if [[ -n "$commits_after_main" ]]; then
        commits_count=$(echo "$commits_after_main" | wc -l)
    else
        commits_count=0
    fi

    # Get committed diff from origin/main to HEAD
    committed_stats=$(git diff "origin/$default_branch" HEAD --shortstat 2>/dev/null)

    # Check if on a stale branch (not main/master, no new commits)
    is_stale_branch=""
    if [[ "$current_branch" != "$default_branch" ]] && [[ $commits_count -eq 0 ]]; then
        is_stale_branch="true"
    fi

    # Build output for this repo
    output=""
    if [[ $commits_count -gt 0 ]] || [[ -n "$has_uncommitted" ]] || [[ -n "$is_stale_branch" ]]; then
        output+="${BLUE}$repo_name${NC} [${YELLOW}$current_branch${NC}]$has_uncommitted\n"

        if [[ $commits_count -gt 0 ]]; then
            output+="  ${GREEN}$commits_count new commits${NC}: $committed_stats\n"
        elif [[ -n "$is_stale_branch" ]]; then
            output+="  ${DIM}(stale branch - switch to $default_branch)${NC}\n"
        fi

        if [[ -n "$uncommitted_stats" ]]; then
            output+="  ${RED}Unstaged${NC}: $uncommitted_stats\n"
        fi
        if [[ -n "$staged_stats" ]]; then
            output+="  ${YELLOW}Staged${NC}: $staged_stats\n"
        fi
        output+="\n"

        # Categorize
        if [[ $commits_count -gt 0 ]]; then
            # Has new work
            if [[ "$current_branch" =~ ^(security|dependabot) ]]; then
                security_wip+="$output"
            else
                active_wip+="$output"
            fi
        elif [[ -n "$is_stale_branch" ]]; then
            # No new work, on old branch - needs cleanup
            stale_branches+="$output"
        elif [[ -n "$has_uncommitted" ]]; then
            # On main but has uncommitted changes
            uncommitted_only+="$output"
        fi
    fi
done

# Print in priority order
if [[ -n "$active_wip" ]]; then
    echo -e "${GREEN}=== Active Work ===${NC}\n"
    echo -e "$active_wip"
fi

if [[ -n "$uncommitted_only" ]]; then
    echo -e "${YELLOW}=== Uncommitted / Stale Branches ===${NC}\n"
    echo -e "$uncommitted_only"
fi

if [[ -n "$stale_branches" ]]; then
    echo -e "${DIM}=== Stale Branches (switch to main) ===${NC}\n"
    echo -e "$stale_branches"
fi

if [[ -n "$security_wip" ]]; then
    echo -e "${DIM}=== Security/Dependabot ===${NC}\n"
    echo -e "$security_wip"
fi

echo "Done."

#!/bin/sh
set -eu

ESC=$(printf '\033')
GREEN="${ESC}[0;32m"
YELLOW="${ESC}[1;33m"
BLUE="${ESC}[0;34m"
RED="${ESC}[0;31m"
DIM="${ESC}[2m"
RESET="${ESC}[0m"

# Parse arguments
SINGLE_PACKAGE=""
while [ $# -gt 0 ]; do
    case "$1" in
        -p|--package)
            SINGLE_PACKAGE="$2"
            shift 2
            ;;
        -h|--help)
            printf "Usage: %s [-p|--package <name>]\n" "$0"
            printf "  -p, --package <name>  Show all tool versions for a single package\n"
            printf "  -h, --help            Show this help message\n"
            exit 0
            ;;
        *)
            printf "Unknown option: %s\n" "$1"
            exit 1
            ;;
    esac
done

# Get version from package.json packageManager field (pnpm@x.x.x+sha...)
get_pnpm_version() {
    grep '"packageManager":' "$1" 2>/dev/null | sed 's/.*pnpm@\([^+"]*\).*/\1/' || printf ""
}

# Get version from .nvmrc
get_node_version() {
    tr -d '[:space:]' < "$1" 2>/dev/null || printf ""
}

# Get devDependency version from package.json
get_dev_dependency() {
    grep "\"$2\":" "$1" 2>/dev/null | sed 's/.*": *"[\^~]*\([^"]*\)".*/\1/' || printf ""
}

# Get newest version of a dependency from workspace packages
get_workspace_dependency() {
    newest=""
    for pkg in "$1/package.json" "$1"/packages/*/package.json; do
        [ -f "$pkg" ] || continue
        v=$(get_dev_dependency "$pkg" "$2")
        if [ -n "$v" ]; then
            if [ -z "$newest" ] || [ "$(printf '%s\n%s' "$newest" "$v" | sort -V | tail -1)" = "$v" ]; then
                newest=$v
            fi
        fi
    done
    printf "%s" "$newest"
}

# Collect repo directories
collect_repos() {
    for dir in ../*/; do
        name=$(basename "$dir")
        [ "$name" = "ecosystem" ] && continue
        [ "$name" = "repro" ] && continue
        [ -f "$dir/package.json" ] && printf "%s\n" "$dir"
    done
}

# Version stats helpers
find_mode() { printf "%s\n" "$1" | grep -v '^$' | sort | uniq -c | sort -rn | head -1 | awk '{print $2}'; }
find_oldest() { printf "%s\n" "$1" | grep -v '^$' | sort -V | head -1; }
find_newest() { printf "%s\n" "$1" | grep -v '^$' | sort -V | tail -1; }

# Get color based on version difference (red=major, yellow=minor, blue=patch)
version_color() {
    current=$1 target=$2
    [ "$current" = "$target" ] && { printf "%s" "$GREEN"; return; }

    # Extract major.minor.patch
    cur_major=$(printf "%s" "$current" | cut -d. -f1)
    cur_minor=$(printf "%s" "$current" | cut -d. -f2)
    tar_major=$(printf "%s" "$target" | cut -d. -f1)
    tar_minor=$(printf "%s" "$target" | cut -d. -f2)

    if [ "$cur_major" != "$tar_major" ]; then
        printf "%s" "$RED"
    elif [ "$cur_minor" != "$tar_minor" ]; then
        printf "%s" "$YELLOW"
    else
        printf "%s" "$BLUE"
    fi
}

# Print summary with status icon
print_summary() {
    latest=$1 mode=$2 oldest=$3 newest=$4
    summary="" icon=""

    # Determine target for color comparison
    target=$newest
    [ -n "$latest" ] && [ "$latest" != "unknown" ] && target=$latest

    [ -n "$latest" ] && [ "$latest" != "unknown" ] && summary="Latest: ${DIM}$latest${RESET}"

    if [ "$oldest" = "$newest" ]; then
        all_color=$(version_color "$oldest" "$target")
        [ -n "$summary" ] && summary="$summary | All: ${all_color}$oldest${RESET}" || summary="All: ${all_color}$oldest${RESET}"
        if [ -n "$latest" ] && [ "$latest" != "unknown" ] && [ "$oldest" = "$latest" ]; then
            icon="✅"
        elif [ -n "$latest" ] && [ "$latest" != "unknown" ]; then
            icon="⚠️"
        else
            icon="✅"
        fi
    else
        icon="⚠️"
        oldest_color=$(version_color "$oldest" "$target")
        newest_color=$(version_color "$newest" "$target")
        [ -n "$summary" ] && summary="$summary | Oldest: ${oldest_color}$oldest${RESET} | Newest: ${newest_color}$newest${RESET}" || summary="Oldest: ${oldest_color}$oldest${RESET} | Newest: ${newest_color}$newest${RESET}"
    fi

    printf "  %b %s\n" "$summary" "$icon"
}

# Generic tool checker
check_tool() {
    tool_name=$1
    npm_pkg=$2
    get_version_cmd=$3

    printf "\n${BLUE}═══ %s ═══${RESET}\n" "$tool_name"

    # Get latest from npm if package specified
    latest="unknown"
    [ -n "$npm_pkg" ] && latest=$(npm view "$npm_pkg" version 2>/dev/null || printf "unknown")

    # Collect versions
    versions=""
    for repo_dir in $(collect_repos); do
        version=$(eval "$get_version_cmd")
        [ -n "$version" ] && { [ -n "$versions" ] && versions="$versions
$version" || versions="$version"; }
    done

    mode=$(find_mode "$versions")
    oldest=$(find_oldest "$versions")
    newest=$(find_newest "$versions")
    print_summary "$latest" "$mode" "$oldest" "$newest"

    # Determine target version
    target=$newest
    [ "$latest" != "unknown" ] && target=$latest

    # Print per-repo status
    for repo_dir in $(collect_repos); do
        repo=$(basename "$repo_dir")
        version=$(eval "$get_version_cmd")
        if [ -z "$version" ]; then
            printf "  %s: ${YELLOW}not found${RESET}\n" "$repo"
        else
            color=$(version_color "$version" "$target")
            printf "  %s: ${color}%s${RESET}\n" "$repo" "$version"
        fi
    done
}

# Special checker for Node.js (.nvmrc - no npm package)
check_node() {
    printf "\n${BLUE}═══ Node.js (.nvmrc) ═══${RESET}\n"

    versions=""
    for repo_dir in $(collect_repos); do
        nvmrc="$repo_dir/.nvmrc"
        [ -f "$nvmrc" ] && version=$(get_node_version "$nvmrc") && [ -n "$version" ] && {
            [ -n "$versions" ] && versions="$versions
$version" || versions="$version"
        }
    done

    mode=$(find_mode "$versions")
    oldest=$(find_oldest "$versions")
    newest=$(find_newest "$versions")
    [ -n "$mode" ] && print_summary "" "$mode" "$oldest" "$newest"

    for repo_dir in $(collect_repos); do
        repo=$(basename "$repo_dir")
        nvmrc="$repo_dir/.nvmrc"
        if [ -f "$nvmrc" ]; then
            version=$(get_node_version "$nvmrc")
            color=$(version_color "$version" "$newest")
            printf "  %s: ${color}%s${RESET}\n" "$repo" "$version"
        else
            printf "  %s: ${YELLOW}no .nvmrc${RESET}\n" "$repo"
        fi
    done
}

# Single package mode - show all tools for one package
check_single_package() {
    pkg_name=$1
    repo_dir="../$pkg_name"

    if [ ! -d "$repo_dir" ] || [ ! -f "$repo_dir/package.json" ]; then
        printf "${RED}Package not found: %s${RESET}\n" "$pkg_name"
        exit 1
    fi

    printf "${BLUE}═══ %s ═══${RESET}\n\n" "$pkg_name"

    # Node.js
    nvmrc="$repo_dir/.nvmrc"
    if [ -f "$nvmrc" ]; then
        version=$(get_node_version "$nvmrc")
        printf "  Node.js:    ${GREEN}%s${RESET}\n" "$version"
    else
        printf "  Node.js:    ${YELLOW}no .nvmrc${RESET}\n"
    fi

    # pnpm
    version=$(get_pnpm_version "$repo_dir/package.json")
    latest=$(npm view pnpm version 2>/dev/null || printf "unknown")
    if [ -n "$version" ]; then
        color=$(version_color "$version" "$latest")
        if [ "$version" = "$latest" ]; then
            printf "  pnpm:       ${color}%s${RESET}\n" "$version"
        else
            printf "  pnpm:       ${color}%s${RESET} ${DIM}(latest: %s)${RESET}\n" "$version" "$latest"
        fi
    else
        printf "  pnpm:       ${YELLOW}not found${RESET}\n"
    fi

    # Turbo
    version=$(get_dev_dependency "$repo_dir/package.json" "turbo")
    latest=$(npm view turbo version 2>/dev/null || printf "unknown")
    if [ -n "$version" ]; then
        color=$(version_color "$version" "$latest")
        if [ "$version" = "$latest" ]; then
            printf "  Turbo:      ${color}%s${RESET}\n" "$version"
        else
            printf "  Turbo:      ${color}%s${RESET} ${DIM}(latest: %s)${RESET}\n" "$version" "$latest"
        fi
    else
        printf "  Turbo:      ${YELLOW}not found${RESET}\n"
    fi

    # TypeScript
    version=$(get_workspace_dependency "$repo_dir" "typescript")
    latest=$(npm view typescript version 2>/dev/null || printf "unknown")
    if [ -n "$version" ]; then
        color=$(version_color "$version" "$latest")
        if [ "$version" = "$latest" ]; then
            printf "  TypeScript: ${color}%s${RESET}\n" "$version"
        else
            printf "  TypeScript: ${color}%s${RESET} ${DIM}(latest: %s)${RESET}\n" "$version" "$latest"
        fi
    else
        printf "  TypeScript: ${YELLOW}not found${RESET}\n"
    fi

    # lefthook
    version=$(get_dev_dependency "$repo_dir/package.json" "lefthook")
    latest=$(npm view lefthook version 2>/dev/null || printf "unknown")
    if [ -n "$version" ]; then
        color=$(version_color "$version" "$latest")
        if [ "$version" = "$latest" ]; then
            printf "  lefthook:   ${color}%s${RESET}\n" "$version"
        else
            printf "  lefthook:   ${color}%s${RESET} ${DIM}(latest: %s)${RESET}\n" "$version" "$latest"
        fi
    else
        printf "  lefthook:   ${YELLOW}not found${RESET}\n"
    fi

    # syncpack
    version=$(get_dev_dependency "$repo_dir/package.json" "syncpack")
    latest=$(npm view syncpack version 2>/dev/null || printf "unknown")
    if [ -n "$version" ]; then
        color=$(version_color "$version" "$latest")
        if [ "$version" = "$latest" ]; then
            printf "  syncpack:   ${color}%s${RESET}\n" "$version"
        else
            printf "  syncpack:   ${color}%s${RESET} ${DIM}(latest: %s)${RESET}\n" "$version" "$latest"
        fi
    else
        printf "  syncpack:   ${YELLOW}not found${RESET}\n"
    fi
}

# Main
if [ -n "$SINGLE_PACKAGE" ]; then
    check_single_package "$SINGLE_PACKAGE"
else
    printf "${BLUE}Checking tooling versions across repositories...${RESET}\n"

    check_node
    check_tool "pnpm (packageManager)" "pnpm" 'get_pnpm_version "$repo_dir/package.json"'
    check_tool "Turbo" "turbo" 'get_dev_dependency "$repo_dir/package.json" "turbo"'
    check_tool "TypeScript" "typescript" 'get_workspace_dependency "$repo_dir" "typescript"'
    check_tool "lefthook" "lefthook" 'get_dev_dependency "$repo_dir/package.json" "lefthook"'
    check_tool "syncpack" "syncpack" 'get_dev_dependency "$repo_dir/package.json" "syncpack"'
fi

printf "\n${GREEN}✅ Check complete${RESET}\n"

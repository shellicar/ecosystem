#!/bin/sh
set -eu

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Get latest Biome version from npm
get_latest_version() {
  npm view @biomejs/biome version 2>/dev/null || printf "unknown"
}

# Extract version from package.json devDependencies
get_installed_version() {
  pkg_json=$1
  grep '"@biomejs/biome":' "$pkg_json" 2>/dev/null |
    sed 's/.*": *"[\^~]*\([^"]*\)".*/\1/' || printf ""
}

# Extract schema version from biome.json
get_schema_version() {
  biome_json=$1
  grep '"$schema":' "$biome_json" 2>/dev/null |
    sed 's|.*/schemas/\([^/]*\)/.*|\1|' || printf ""
}

# Compare semver versions (returns 0 if v1 < v2)
version_lt() {
  v1=$1
  v2=$2
  [ "$v1" != "$v2" ] && [ "$(printf '%s\n%s' "$v1" "$v2" | sort -V | head -n1)" = "$v1" ]
}

# Check a single repository
check_repo() {
  biome_json=$1
  latest=$2
  repo_dir=$(dirname "$biome_json")
  repo_name=$(basename "$repo_dir")
  pkg_json="$repo_dir/package.json"

  printf "${BLUE}%s${RESET}\n" "$repo_name"

  # Check if package.json exists
  if [ ! -f "$pkg_json" ]; then
    printf "  ${YELLOW}⚠️ No package.json${RESET}\n\n"
    return 1
  fi

  installed=$(get_installed_version "$pkg_json")
  schema=$(get_schema_version "$biome_json")

  # Check if installed version exists
  if [ -z "$installed" ]; then
    printf "  ${YELLOW}⚠️ No @biomejs/biome in package.json${RESET}\n\n"
    return 1
  fi

  printf "  Installed: %s\n" "$installed"
  printf "  Schema:    %s\n" "$schema"

  has_issues=false

  # Check if outdated compared to latest
  if [ "$latest" != "unknown" ] && version_lt "$installed" "$latest"; then
    printf "  ${YELLOW}⚠️ Outdated: %s → %s${RESET}\n" "$installed" "$latest"
    printf "    Run: ${GREEN}pnpm add -D @biomejs/biome@latest${RESET}\n"
    has_issues=true
  fi

  # Check if schema version differs from installed
  if [ -n "$schema" ] && [ "$schema" != "$installed" ]; then
    printf "  ${YELLOW}⚠️ Schema mismatch: biome.json (%s) ≠ installed (%s)${RESET}\n" "$schema" "$installed"
    printf "    Run: ${GREEN}pnpm biome migrate --write${RESET}\n"
    has_issues=true
  fi

  if [ "$has_issues" = false ]; then
    printf "  ${GREEN}✅ Up to date${RESET}\n"
  fi

  printf "\n"
  if [ "$has_issues" = true ]; then return 1; else return 0; fi
}

# Main
printf "${BLUE}Checking Biome versions across repositories...${RESET}\n\n"

latest=$(get_latest_version)
printf "Latest Biome version: ${GREEN}%s${RESET}\n\n" "$latest"

has_issues=false

for biome_json in $(find -L .. -maxdepth 2 -name "biome.json" -type f | sort); do
  repo_name=$(basename "$(dirname "$biome_json")")
  [ "$repo_name" = "ecosystem" ] && continue

  check_repo "$biome_json" "$latest" || has_issues=true
done

if [ "$has_issues" = true ]; then
  printf "${YELLOW}Some repositories need attention.${RESET}\n"
  exit 1
else
  printf "${GREEN}All repositories are in sync!${RESET}\n"
fi

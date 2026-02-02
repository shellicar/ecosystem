#!/bin/sh
set -eu

# Source common definitions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

printf "${BLUE}Fetching issues across @shellicar repositories...${RESET}\n\n"

total=0
for repo in $ALL_REPOS; do
  issues=$(gh issue list --repo "shellicar/$repo" --json number,state,title,author --template '{{range .}}#{{.number}}	{{.state}}	@{{.author.login}}	{{.title}}{{"\n"}}{{end}}' 2>/dev/null || printf "")

  if [ -n "$issues" ]; then
    printf "${BLUE}═══ %s ═══${RESET} https://github.com/shellicar/%s/issues\n" "$repo" "$repo"
    printf "%s\n\n" "$issues"
    count=$(printf '%s\n' "$issues" | wc -l)
    total=$((total + count))
  fi
done

if [ "$total" -eq 0 ]; then
  printf "${GREEN}No open issues found.${RESET}\n"
else
  printf "${YELLOW}Total: %d issue(s)${RESET}\n" "$total"
fi

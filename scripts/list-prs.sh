#!/bin/sh
set -eu

# Source common definitions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.sh"

printf "${BLUE}Fetching pull requests across @shellicar repositories...${RESET}\n\n"

total=0
for repo in $ALL_REPOS; do
  prs=$(gh pr list --repo "shellicar/$repo" --json number,state,title,author --template '{{range .}}#{{.number}}	{{.state}}	@{{.author.login}}	{{.title}}{{"\n"}}{{end}}' 2>/dev/null || printf "")

  if [ -n "$prs" ]; then
    printf "${BLUE}═══ %s ═══${RESET} https://github.com/shellicar/%s/pulls\n" "$repo" "$repo"
    printf "%s\n\n" "$prs"
    count=$(printf '%s\n' "$prs" | wc -l)
    total=$((total + count))
  fi
done

if [ "$total" -eq 0 ]; then
  printf "${GREEN}No open pull requests found.${RESET}\n"
else
  printf "${YELLOW}Total: %d PR(s)${RESET}\n" "$total"
fi

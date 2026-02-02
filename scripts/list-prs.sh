#!/bin/sh
set -eu

ESC=$(printf '\033')
GREEN="${ESC}[0;32m"
YELLOW="${ESC}[1;33m"
BLUE="${ESC}[0;34m"
RESET="${ESC}[0m"

REPOS="build-azure-local-settings
build-clean
build-graphql
build-version
core-config
core-di
cosmos-query-builder
reference-enterprise
reference-foundation
svelte-adapter-azure-functions
ui-shadcn
winston-azure-application-insights"

printf "${BLUE}Fetching pull requests across @shellicar repositories...${RESET}\n\n"

total=0
for repo in $REPOS; do
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

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

printf "${BLUE}Fetching issues across @shellicar repositories...${RESET}\n\n"

total=0
for repo in $REPOS; do
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

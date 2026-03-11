#!/bin/sh
# Common definitions for ecosystem scripts

ESC=$(printf '\033')
GREEN="${ESC}[0;32m"
YELLOW="${ESC}[1;33m"
BLUE="${ESC}[0;34m"
RED="${ESC}[0;31m"
DIM="${ESC}[2m"
NC="${ESC}[0m"
RESET="${ESC}[0m"

ALL_REPOS="build-azure-local-settings
build-clean
build-graphql
build-version
core-config
core-di
claude-cli
cosmos-query-builder
ecosystem
graphql-codegen-treeshake
reference-enterprise
reference-foundation
svelte-adapter-azure-functions
ui-shadcn
winston-azure-application-insights"

LIBRARY_REPOS="build-azure-local-settings
build-clean
build-graphql
build-version
core-config
core-di
claude-cli
cosmos-query-builder
graphql-codegen-treeshake
svelte-adapter-azure-functions
ui-shadcn
winston-azure-application-insights"

# Config/meta repos (no npm package, simplified ruleset)
CONFIG_REPOS="ecosystem"

# GitHub owner
GITHUB_OWNER="shellicar"

# Workspace directory
WORKSPACE_DIR="/home/stephen/repos/@shellicar"

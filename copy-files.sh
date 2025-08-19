#!/bin/sh

set -eu

PACKAGES="build-graphql
build-version
build-clean
core-config
core-di
reference-foundation
reference-enterprise
winston-azure-application-insights
svelte-adapter-azure-functions"

cd files/
for j in $PACKAGES; do
  cp --update=none -r . "../../$j/"
done

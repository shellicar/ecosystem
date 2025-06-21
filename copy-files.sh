#!/bin/sh

set -eu

PACKAGES="build-graphql
build-version
core-config
core-di
reference-foundation
reference-enterprise
svelte-adapter-azure-functions"

cd files/
for j in $PACKAGES; do
  cp --update=none -r . "../../$j/"
done

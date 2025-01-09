#!/bin/sh

set -eu

PACKAGES="build-graphql
build-version
core-config
core-di
svelte-adapter-azure-functions"

cd files/
for j in $PACKAGES; do
  cp -r . "../../$j/"
done

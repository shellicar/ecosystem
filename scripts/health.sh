#!/bin/sh
# Ecosystem health dashboard — aggregates all audit scripts.
# Per-package: check-tsconfig, audit-package-json, check-biome.
# Workspace-level: check-deps.
# Outputs JSON.
#
# Usage:
#   health.sh              # Full audit
#   health.sh build-clean  # Single-package audit (no deps check)

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_ARG="${1:-}"

AUDIT_TMP="$(mktemp -d)"
trap 'rm -rf "$AUDIT_TMP"' EXIT

run_check() {
  script="$1" out="$2"
  if [ -n "$PKG_ARG" ]; then
    "$SCRIPT_DIR/$script" "$PKG_ARG" > "$AUDIT_TMP/$out" 2>/dev/null || true
  else
    "$SCRIPT_DIR/$script" > "$AUDIT_TMP/$out" 2>/dev/null || true
  fi
}

run_check "check-tsconfig.sh"     "tsconfig.json"
run_check "audit-package-json.sh" "pkg.json"
run_check "check-biome.sh"        "biome.json"

if [ -z "$PKG_ARG" ]; then
  "$SCRIPT_DIR/check-deps.sh" > "$AUDIT_TMP/deps.json" 2>/dev/null || true
fi

AUDIT_TMP="$AUDIT_TMP" node -e "
  const fs = require('fs');
  const d = process.env.AUDIT_TMP;

  const readJson = name => {
    const p = d + '/' + name;
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) { return null; }
  };

  const tsconfig = readJson('tsconfig.json');
  const pkgJson  = readJson('pkg.json');
  const biome    = readJson('biome.json');
  const deps     = readJson('deps.json');

  const byName = new Map();

  const mergeRepos = (data, key) => {
    if (!data || !data.repos) return;
    for (const repo of data.repos) {
      if (!byName.has(repo.name)) byName.set(repo.name, { checks: {} });
      byName.get(repo.name).checks[key] = { score: repo.score, max: repo.max, pct: repo.pct };
    }
  };

  mergeRepos(tsconfig, 'tsconfig');
  mergeRepos(pkgJson,  'package_json');
  mergeRepos(biome,    'biome');

  const packages = Array.from(byName.entries()).map(([name, data]) => {
    const vals  = Object.values(data.checks);
    const score = vals.reduce((a, c) => a + c.score, 0);
    const max   = vals.reduce((a, c) => a + c.max,   0);
    const pct   = max > 0 ? Math.round(score * 100 / max) : 0;
    return { name, score, max, pct, checks: data.checks };
  });

  const avgPct = packages.length > 0
    ? Math.round(packages.reduce((a, p) => a + p.pct, 0) / packages.length)
    : 0;

  const errors   = [tsconfig, pkgJson, biome].filter(Boolean)
    .reduce((a, x) => a + (x.summary ? x.summary.errors   : 0), 0);
  const warnings = [tsconfig, pkgJson, biome].filter(Boolean)
    .reduce((a, x) => a + (x.summary ? x.summary.warnings : 0), 0);

  const result = {
    packages,
    summary: { packages: packages.length, avg_pct: avgPct, errors, warnings },
  };

  if (deps) result.workspace = { deps };

  process.stdout.write(JSON.stringify(result) + '\n');
"

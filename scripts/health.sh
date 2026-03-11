#!/bin/sh
# Master health check across @shellicar repos.
# Runs all scoring scripts and aggregates into an overall health rating.
#
# Scoring scripts (each contribute equally to overall pct):
#   check-tsconfig.sh      — tsconfig modernisation
#   check-migrations.sh    — tooling migrations
#   audit-package-json.sh  — package.json conformance
#   check-deps.sh          — dependency staleness
#
# Status scripts (summarised separately, not scored):
#   audit-all.sh           — CVE vulnerability status
#   check-biome.sh         — Biome version consistency
#
# Usage:
#   health.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ECOSYSTEM_DIR="$(dirname "$SCRIPT_DIR")"

tsconfig_out=$("$ECOSYSTEM_DIR/check-tsconfig.sh"   2>/dev/null || true)
migrations_out=$("$ECOSYSTEM_DIR/check-migrations.sh" 2>/dev/null || true)
pkgjson_out=$("$SCRIPT_DIR/audit-package-json.sh"   2>/dev/null || true)
deps_out=$("$SCRIPT_DIR/check-deps.sh"              2>/dev/null || true)
audit_out=$("$SCRIPT_DIR/audit-all.sh"              2>/dev/null || true)
biome_out=$("$SCRIPT_DIR/check-biome.sh"            2>/dev/null || true)

printf '%s\n%s\n%s\n%s\n%s\n%s\n' \
  "$tsconfig_out" "$migrations_out" "$pkgjson_out" "$deps_out" "$audit_out" "$biome_out" \
  | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => { if (l.trim()) lines.push(l.trim()); });
rl.on('close', () => {
  const [tsconfig, migrations, pkgjson, deps, audit, biome] = lines.map(l => {
    try { return JSON.parse(l); } catch(e) { return null; }
  });

  // Collect all repo names across scoring scripts
  const repoNames = new Set();
  for (const script of [tsconfig, migrations, pkgjson]) {
    if (script?.repos) script.repos.forEach(r => repoNames.add(r.name || r.repo));
  }
  if (deps?.repos) deps.repos.forEach(r => repoNames.add(r.name || r.repo));

  // Build per-repo aggregated score
  const repoMap = {};
  for (const name of repoNames) {
    const scores = [];
    const find = (script, key) => script?.repos?.find(r => (r.name || r.repo) === name)?.[key];

    const tsPct   = find(tsconfig,   'pct');
    const migPct  = find(migrations, 'pct');
    const pkgPct  = find(pkgjson,    'pct');
    const depsPct = find(deps,       'pct');

    if (tsPct   != null) scores.push({ label: 'tsconfig',   pct: tsPct });
    if (migPct  != null) scores.push({ label: 'migrations', pct: migPct });
    if (pkgPct  != null) scores.push({ label: 'pkg_json',   pct: pkgPct });
    if (depsPct != null) scores.push({ label: 'deps',       pct: depsPct });

    const overall = scores.length
      ? Math.round(scores.reduce((s, x) => s + x.pct, 0) / scores.length)
      : 0;

    // Status fields from non-scoring scripts
    const biomeRepo  = biome?.repos?.find(r => (r.name || r.repo) === name);
    const auditRepo  = audit?.repos?.find(r => (r.name || r.repo) === name);

    repoMap[name] = {
      repo: name,
      overall,
      scores,
      biome:  biomeRepo  ? biomeRepo.status  : null,
      vulns:  auditRepo  ? auditRepo.status   : null,
    };
  }

  const sorted = Object.values(repoMap).sort((a, b) => a.overall - b.overall);
  const totalOverall = sorted.length
    ? Math.round(sorted.reduce((s, r) => s + r.overall, 0) / sorted.length)
    : 0;

  const biomeIssues  = biome?.repos?.filter(r => r.status !== 'ok').length ?? 0;
  const vulnRepos    = audit?.repos?.filter(r => r.status !== 'clean').length ?? 0;

  console.log(JSON.stringify({
    overall: totalOverall,
    repos: sorted,
    summary: {
      repos: sorted.length,
      biome_issues: biomeIssues,
      vulnerable_repos: vulnRepos,
    }
  }));
});
"

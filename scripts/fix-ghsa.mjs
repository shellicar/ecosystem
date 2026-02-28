#!/usr/bin/env node
// Apply targeted pnpm overrides from GHSA vulnerability data.
//
// Reads vulnerability data from stdin as JSON array:
//   [{"pkg":"koa","vulnerable":">= 3.0.0, < 3.1.2","patched":"3.1.2"}, ...]
//
// Updates pnpm-workspace.yaml overrides section:
//   - Adds new overrides for unhandled vulnerable ranges
//   - Supersedes stale overrides (same package, contained range, lower patch)
//   - Removes overrides that are fully covered by a new wider range
//
// Usage:
//   echo '[...]' | node fix-ghsa.mjs /path/to/pnpm-workspace.yaml

import { readFileSync, writeFileSync } from "node:fs";
import semver from "semver";
import YAML from "yaml";

const workspacePath = process.argv[2];
if (!workspacePath) {
  process.stderr.write("Usage: node fix-ghsa.mjs <pnpm-workspace.yaml>\n");
  process.exit(1);
}

// ── Read inputs ─────────────────────────────────────────────────────

const input = readFileSync("/dev/stdin", "utf8");
const vulnerabilities = JSON.parse(input);

if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
  process.stderr.write("No vulnerability data on stdin\n");
  process.exit(1);
}

const raw = readFileSync(workspacePath, "utf8");
const doc = YAML.parseDocument(raw, { schema: "failsafe" });
const overridesNode = doc.get("overrides", true);
const merged = new Map();
if (overridesNode && YAML.isPair(overridesNode) || YAML.isMap(overridesNode)) {
  for (const pair of overridesNode.items) {
    merged.set(String(pair.key), String(pair.value));
  }
} else if (overridesNode) {
  // Fallback: plain object parse
  const parsed = YAML.parse(raw, { schema: "failsafe" });
  if (parsed.overrides) {
    for (const [k, v] of Object.entries(parsed.overrides)) {
      merged.set(k, v);
    }
  }
}
const actions = [];

// ── Helpers ─────────────────────────────────────────────────────────

// Convert API range ">= 3.0.0, < 3.1.2" to pnpm format ">=3.0.0 <3.1.2"
function normalizeRange(range) {
  return range
    .replace(/,\s*/g, " ")
    .replace(/(>=|<=|>|<)\s+/g, "$1")
    .trim();
}

// Parse override key "koa@>=3.0.0 <3.1.2" → { pkg: "koa", range: ">=3.0.0 <3.1.2" }
function parseKey(key) {
  let atIdx;
  if (key.startsWith("@")) {
    atIdx = key.indexOf("@", 1);
  } else {
    atIdx = key.indexOf("@");
  }
  if (atIdx === -1) return { pkg: key, range: "" };
  return { pkg: key.substring(0, atIdx), range: key.substring(atIdx + 1) };
}

// Extract lower bound version: ">=9.0.0 <9.0.7" → "9.0.0", "<2.16.4" → null
function lowerBound(range) {
  const m = range.match(/>=([\d.]+[-\w.]*)/);
  return m ? m[1] : null;
}

// Extract upper bound version: ">=9.0.0 <9.0.7" → "9.0.7", "<2.16.4" → "2.16.4"
function upperBound(range) {
  const m = range.match(/<=?([\d.]+[-\w.]*)/);
  return m ? m[1] : null;
}

// Extract patched version from value: ">=9.0.7" → "9.0.7"
function patchedVer(value) {
  const m = value.match(/>=([\d.]+[-\w.]*)/);
  return m ? m[1] : null;
}

// Does rangeA fully contain rangeB? (for same package)
// e.g. "<2.16.4" contains ">=2.16.2 <2.16.3"
function rangeContains(outerRange, innerRange) {
  const oLo = lowerBound(outerRange);
  const oHi = upperBound(outerRange);
  const iLo = lowerBound(innerRange);
  const iHi = upperBound(innerRange);

  // Check lower: outer lower must be <= inner lower
  // null lower = 0.0.0, covers everything below
  if (oLo && iLo && semver.gt(oLo, iLo)) return false;
  if (oLo && !iLo) return false; // outer has floor, inner doesn't

  // Check upper: outer upper must be >= inner upper
  if (oHi && iHi && semver.gt(iHi, oHi)) return false;
  if (!oHi && iHi) return true; // outer has no ceiling
  if (oHi && !iHi) return false; // inner has no ceiling but outer does

  return true;
}

// ── Build new overrides ─────────────────────────────────────────────

for (const vuln of vulnerabilities) {
  const range = normalizeRange(vuln.vulnerable);
  const key = `${vuln.pkg}@${range}`;
  const value = `>=${vuln.patched}`;

  // If exact same key+value already exists, nothing to do
  if (merged.get(key) === value) continue;

  // Remove all existing overrides for the same package whose range is contained by the new one
  for (const [existingKey] of merged) {
    const existing = parseKey(existingKey);
    if (existing.pkg !== vuln.pkg) continue;
    if (existingKey === key) continue; // handled separately below
    if (rangeContains(range, existing.range)) {
      actions.push({ action: "remove", key: existingKey, value: merged.get(existingKey) });
      merged.delete(existingKey);
    }
  }

  // Add or update the override
  merged.set(key, value);
  actions.push({ action: "add", key, value });
}

// ── Write back ──────────────────────────────────────────────────────

// Build a new YAML map node with proper quoting
const sortedEntries = [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const newMap = new YAML.YAMLMap();
for (const [k, v] of sortedEntries) {
  const keyNode = new YAML.Scalar(k);
  keyNode.type = YAML.Scalar.QUOTE_SINGLE;
  const valNode = new YAML.Scalar(v);
  valNode.type = YAML.Scalar.QUOTE_SINGLE;
  newMap.add(new YAML.Pair(keyNode, valNode));
}

doc.set("overrides", newMap);
writeFileSync(workspacePath, doc.toString());

// ── Report ──────────────────────────────────────────────────────────

for (const a of actions) {
  if (a.action === "remove") {
    process.stdout.write(`  REMOVE  ${a.key}: '${a.value}'\n`);
  } else {
    process.stdout.write(`  ADD     ${a.key}: '${a.value}'\n`);
  }
}

if (actions.length === 0) {
  process.stdout.write("  No changes needed\n");
  process.exit(2);
}

process.exit(0);

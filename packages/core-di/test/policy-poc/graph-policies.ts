/**
 * Layer 5 — judgement. Depends on: facts (and types). NEVER on lifetimes or the provider.
 *
 * A graph policy reads the facts and decides what is a problem for this
 * composition. "Should a singleton only hold singletons?" is answered here,
 * by choosing which policy to compose — not by the lifetime layer.
 */
import type { GraphFacts } from './facts';
import type { Token } from './types';

export type Problem = { readonly kind: string; readonly token: Token };
export type GraphPolicy = (facts: GraphFacts) => Problem[];

const reachableFrom = (facts: GraphFacts, start: Token): Token[] => {
  const seen = new Set<Token>();
  const out: Token[] = [];
  const walk = (token: Token) => {
    for (const dep of facts.get(token)?.deps ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      out.push(dep);
      walk(dep);
    }
  };
  walk(start);
  return out;
};

const forEachSingleton = (facts: GraphFacts, visit: (token: Token) => void) => {
  for (const [token, node] of facts) {
    if (node.lifetime === 'singleton') visit(token);
  }
};

/** A singleton may only reach singletons. */
export const strictCaptive: GraphPolicy = (facts) => {
  const problems: Problem[] = [];
  forEachSingleton(facts, (token) => {
    for (const dep of reachableFrom(facts, token)) {
      if (facts.get(dep)?.lifetime !== 'singleton') {
        problems.push({ kind: 'StrictCaptive', token: dep });
      }
    }
  });
  return problems;
};

/** Flag only deps whose table owner is disposed while the holder lives (the MS-DI-ish rule). */
export const disposalCaptive: GraphPolicy = (facts) => {
  const problems: Problem[] = [];
  forEachSingleton(facts, (token) => {
    for (const dep of reachableFrom(facts, token)) {
      if (facts.get(dep)?.owner === 'scope') {
        problems.push({ kind: 'CaptiveDependency', token: dep });
      }
    }
  });
  return problems;
};

/** validate() is just: run the composed policy set. */
export const validate = (facts: GraphFacts, policies: GraphPolicy[]): Problem[] => {
  return policies.flatMap((policy) => policy(facts));
};

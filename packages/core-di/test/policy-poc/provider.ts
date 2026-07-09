/**
 * Layer 5 — the engine. Depends on: types, contracts, dependsOn (edges).
 *
 * The engine's irreducible knowledge, and nothing else:
 *   - the EDGES (definition-time @dependsOn metadata),
 *   - the FLOOR (no feature claims a node: construct per injection point),
 *   - the ENV BAG (carry opaque handles down a resolution),
 *   - its own CALL BOUNDARY (a top-level resolve folds the contributors;
 *     nested resolution during construction reuses the current env — which is
 *     what keeps everything in one pass).
 *
 * It holds no lifetime's table, mints no lifetime's handle, and contains no
 * line that changes when a lifetime is added or removed.
 */
import type { Env, FeatureSet } from './contracts';
import { getDeclaredEdges } from './dependsOn';
import type { Impl, LifetimeName, Node, OnConstruct, Token } from './types';

export class PolicyProvider {
  constructor(
    private readonly regs: Map<Token, Node>,
    private readonly features: FeatureSet,
    private readonly defaultLifetime: LifetimeName,
    private readonly onConstruct: OnConstruct,
  ) {
    // A registration may only declare a lifetime the composition supports.
    // 'transient' is always expressible: it is the floor, not a member.
    for (const [token, node] of regs) {
      if (node.lifetime && node.lifetime !== 'transient' && !(node.lifetime in features)) {
        throw new Error(`unsupported lifetime '${node.lifetime}' on ${token.name}`);
      }
    }
  }

  resolve<T>(token: Token, extraEnv: Env = {}): T {
    // The boundary: one fold over the composed contributors per top-level resolve.
    let env = extraEnv;
    for (const feature of Object.values(this.features)) {
      if (feature?.contribute) {
        env = feature.contribute(env);
      }
    }
    return this.instanceFor(token, env) as T;
  }

  private instanceFor(token: Token, env: Env): unknown {
    const node = this.regs.get(token);
    if (node === undefined) {
      throw new Error(`unregistered ${token.name}`);
    }
    const lifetime = node.lifetime ?? this.defaultLifetime;
    const feature = lifetime === 'transient' ? undefined : this.features[lifetime];
    const build = () => this.construct(node.impl, env);
    // The FLOOR: no feature claims the node — construct per injection point.
    return feature === undefined ? build() : feature.getInstance(token, env, build);
  }

  private construct(impl: Impl, env: Env): unknown {
    const instance = new impl();
    this.onConstruct(impl.name);
    for (const [field, dep] of getDeclaredEdges(impl)) {
      // Nested resolution reuses the current env: same pass, same scope.
      (instance as Record<string, unknown>)[field] = this.instanceFor(dep, env);
    }
    return instance;
  }
}

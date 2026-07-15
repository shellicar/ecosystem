import { CircularDependencyError, SelfDependencyError } from '../errors';
import type { DescriptorMap, ServiceIdentifier, SourceType } from '../types';
import type { Boundary } from './boundaryEngine';
import { DesignDependenciesKey } from './constants';
import { getMetadata } from './metadata';
import { type EngineView, failed, ok, type ResolutionStrategy, type ResolvedField, type StrategyKit } from './strategy';
import type { Env, GraphNode } from './types';

/**
 * The naive strategy: a recursive walk of the dependency tree, resolving each
 * dependency the moment it is met. No plan, no graph derivation, no topological
 * order — recursion builds dependencies before dependents by construction, so
 * prebake candidates need no ordering. Composed where the plan machinery's
 * bytes matter more than its warm-path speed (core-di-lite prebakes everything,
 * so its warm resolve never constructs anyway).
 *
 * Semantics must match the plan strategy exactly; the engine spec runs against
 * both. Construction itself (cycle tracking for opaque factories, error
 * wrapping, disposal) is the kit's — shared, not reimplemented.
 */
// The per-view reverse index: node to its (last-declared) owning token. Built once
// per view because nodeValue needs the owner on every visit; asking the kit's
// ownerOf would scan every registration bucket per visit, an O(n²)-ish build.
type NaiveView = ReadonlyMap<GraphNode, ServiceIdentifier<SourceType>>;

const indexOwners = (services: DescriptorMap): NaiveView => {
  const owners = new Map<GraphNode, ServiceIdentifier<SourceType>>();
  for (const [token, descriptors] of services) {
    for (const descriptor of descriptors) {
      // Last-declared face wins, matching the engine's ownerOf and the derived graph.
      owners.set(descriptor, token);
    }
  }
  return owners;
};

export const createNaiveStrategy =
  () =>
  (kit: StrategyKit): ResolutionStrategy => {
    const ownerFor = (view: EngineView, node: GraphNode): ServiceIdentifier<SourceType> => (view.data as NaiveView).get(node) ?? kit.ownerOf(view, node);

    const nodeValue = (view: EngineView, node: GraphNode, env: Env, boundary: Boundary, path: ReadonlySet<GraphNode>): unknown => {
      const token = ownerFor(view, node);
      const lifetime = kit.effectiveLifetime(node);
      const held = kit.heldErrorFor(node);
      if (held !== undefined) {
        throw held;
      }
      if (path.has(node)) {
        throw new CircularDependencyError(token);
      }
      const nextPath = new Set(path).add(node);

      const depValue = (identifier: ServiceIdentifier<SourceType>): unknown => {
        try {
          const at = kit.surfaceAt(identifier);
          if (at !== undefined) {
            return kit.surfaceValue(at, boundary);
          }
          return nodeValue(view, kit.nodeForToken(view, identifier), env, boundary, nextPath);
        } catch (err) {
          throw kit.wrapForToken(err, token, node.implementation);
        }
      };

      const build = (): unknown => {
        const fields: ResolvedField[] = [];
        const dependencies = getMetadata(DesignDependenciesKey, node.implementation) ?? {};
        for (const [field, identifier] of Object.entries(dependencies)) {
          if (identifier === token) {
            throw new SelfDependencyError();
          }
          fields.push({ field, value: depValue(identifier) });
        }
        let args: SourceType[] | undefined;
        if (node.createFromDeps !== undefined) {
          args = [];
          for (const identifier of node.declaredDeps ?? []) {
            if (identifier === token) {
              throw new SelfDependencyError();
            }
            args.push(depValue(identifier) as SourceType);
          }
        }
        return kit.construct(view, node, token, lifetime, env, boundary, args, fields);
      };

      return kit.cached(lifetime, node, env, build);
    };

    // A minimal printGraph without the graph module: owners and edges read
    // straight off the registrations, matching the plan strategy's line shape.
    const graphLines = (view: EngineView): string[] => {
      const owners = new Map<GraphNode, ServiceIdentifier<SourceType>[]>();
      for (const [owner, descriptors] of view.services) {
        for (const descriptor of descriptors) {
          const list = owners.get(descriptor) ?? [];
          list.push(owner);
          owners.set(descriptor, list);
        }
      }
      const lines: string[] = [`Dependency graph (${owners.size} registration${owners.size === 1 ? '' : 's'})`];
      for (const [node, faces] of owners) {
        if (node.forwardTarget != null) {
          lines.push(`${faces[faces.length - 1].name} -> ${node.forwardTarget.name} (forward)`);
          continue;
        }
        const asyncMark = node.createInstanceAsync != null ? ' (async)' : '';
        lines.push(`${faces.map((face) => face.name).join(', ')} -> ${node.implementation.name} [${kit.effectiveLifetime(node)}]${asyncMark}`);
        const fieldDeps = Object.values(getMetadata<SourceType>(DesignDependenciesKey, node.implementation) ?? {});
        for (const dep of [...(node.declaredDeps ?? []), ...fieldDeps]) {
          lines.push(`    -> ${dep.name}`);
        }
      }
      return lines;
    };

    return {
      createView: (services: DescriptorMap): NaiveView => indexOwners(services),
      instanceFor: (view, node, env, boundary) => {
        try {
          return ok(nodeValue(view, node, env, boundary, new Set()));
        } catch (err) {
          return failed(err);
        }
      },
      // Recursion constructs dependencies first, so candidate order is irrelevant:
      // every distinct node, as registered.
      prebakeCandidates: (view) => {
        const seen = new Set<GraphNode>();
        for (const descriptors of view.services.values()) {
          for (const descriptor of descriptors) {
            seen.add(descriptor);
          }
        }
        return [...seen];
      },
      graphLines,
    };
  };

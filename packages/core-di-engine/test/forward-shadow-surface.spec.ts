import { describe, expect, it } from 'vitest';
import { ForwardBuilder, type ServiceDescriptor, type ServiceIdentifier, type SourceType } from '../src';

abstract class IAlias {}
class Target implements IAlias {}

describe('forward shadow surface', () => {
  it('has no .shadow() on a non-scoped forward result, at the type level or at runtime', () => {
    const added: [ServiceIdentifier<SourceType>, ServiceDescriptor<SourceType>][] = [];
    const builder = new ForwardBuilder(IAlias, (identifier, descriptor) => {
      added.push([identifier, descriptor]);
    });

    const result = builder.to(Target);

    // @ts-expect-error - a non-scoped forward result never carries .shadow()
    expect(result.shadow).toBeUndefined();
  });
});

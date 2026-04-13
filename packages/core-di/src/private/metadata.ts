import type { MetadataType, SourceType } from '../types';

const store = new WeakMap<object, Map<string, unknown>>();

export const getMetadata = <T extends SourceType>(key: string, obj: object): MetadataType<T> | undefined => {
  return store.get(obj)?.get(key) as MetadataType<T> | undefined;
};

export const defineMetadata = <T extends SourceType>(key: string, metadata: MetadataType<T>, obj: object) => {
  let inner = store.get(obj);
  if (inner === undefined) {
    inner = new Map<string, unknown>();
    store.set(obj, inner);
  }
  inner.set(key, metadata);
};

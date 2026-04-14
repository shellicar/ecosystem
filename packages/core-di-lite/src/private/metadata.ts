import type { MetadataType, SourceType } from '../types';

const store = new WeakMap<object, MetadataType<any>>();

export const getMetadata = <T extends SourceType>(obj: object): MetadataType<T> | undefined => {
  return store.get(obj);
};

export const defineMetadata = <T extends SourceType>(metadata: MetadataType<T>, obj: object) => {
  store.set(obj, metadata);
};

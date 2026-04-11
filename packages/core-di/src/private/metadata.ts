import '@abraham/reflection';
import type { MetadataType, SourceType } from '../types';

export const getMetadata = <T extends SourceType>(key: string, obj: object): MetadataType<T> | undefined => Reflect.getMetadata(key, obj);
export const defineMetadata = <T extends SourceType>(key: string, metadata: MetadataType<T>, obj: object) => Reflect.defineMetadata(key, metadata, obj);

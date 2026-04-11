import util, { type InspectOptions } from 'node:util';
import type { BaseObject, InspectFunction } from './types';

export abstract class ISecureString implements BaseObject {
  public abstract toString(): string;
  public abstract toJSON(): string | object;
  public abstract [util.inspect.custom](depth: number, options: InspectOptions, inspect: InspectFunction): string;
  public abstract get secretValue(): string;
}

export abstract class ISecureConnectionString implements BaseObject {
  public abstract toString(): string;
  public abstract toJSON(): string | object;
  public abstract [util.inspect.custom](depth: number, options: InspectOptions, inspect: InspectFunction): string;
  public abstract get secretValue(): string;
}

export abstract class ISecureURL implements BaseObject {
  public abstract toString(): string;
  public abstract toJSON(): object;
  public abstract [util.inspect.custom](depth: number, options: InspectOptions, inspect: InspectFunction): string;
  public abstract get secretValue(): URL;
}

export abstract class ISecureFactory {
  public abstract string(value: string): ISecureString;
  public abstract connectionString(value: string, secretKeys?: readonly string[]): ISecureConnectionString;
  public abstract url(value: URL): ISecureURL;
}

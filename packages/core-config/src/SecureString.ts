import util, { type InspectOptions } from 'node:util';
import { hash } from './hash';
import { ISecureString } from './interfaces';
import type { IEncryptedValue, InspectFunction, SecureConfig } from './types';

export class SecureString extends ISecureString {
  readonly #encryptedValue: IEncryptedValue;
  readonly #hash: string;

  public get secretValue(): string {
    return this.#encryptedValue.getValue();
  }

  private constructor(value: string, config: SecureConfig) {
    super();
    this.#encryptedValue = config.encryptionProvider.encrypt(value);
    this.#hash = hash(value, config.secret);
  }

  static factory(config: SecureConfig): (value: string) => SecureString {
    return (value: string) => SecureString.from(value, config);
  }

  public static from<T extends string | null | undefined>(value: T, config: SecureConfig): T extends string ? SecureString : T {
    if (value === null) {
      return null as T extends string ? SecureString : T;
    }
    if (value === undefined) {
      return undefined as T extends string ? SecureString : T;
    }
    return new SecureString(value, config) as T extends string ? SecureString : T;
  }

  public override toString() {
    return this.#hash;
  }
  public override toJSON() {
    return this.toString();
  }
  override [util.inspect.custom](depth: number, options: InspectOptions, inspect: InspectFunction): string {
    if (depth < 0) {
      return '[SecureString]';
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth == null ? null : options.depth - 1,
    });
    return inspect(this.toJSON(), newOptions);
  }
}

import util, { type InspectOptions } from 'node:util';
import { ISecureConnectionString } from './interfaces';
import { SecureString } from './SecureString';
import type { IEncryptedValue, InspectFunction, SecureConfig, SecureKeys } from './types';

export class SecureConnectionString extends ISecureConnectionString {
  readonly #encryptedValue: IEncryptedValue;
  readonly #data: [string, string | SecureString][];

  public get secretValue(): string {
    return this.#encryptedValue.getValue();
  }

  private constructor(value: string, config: SecureConfig) {
    super();
    this.#encryptedValue = config.encryptionProvider.encrypt(value);
    this.#data = this.parseConnectionString(
      value,
      config.secretKeys.map((x) => x.toLocaleLowerCase()),
      config,
    );
  }

  private parseConnectionString(value: string, secretKeys: SecureKeys, config: SecureConfig): [string, string | SecureString][] {
    return value
      .split(';')
      .filter(Boolean)
      .map((pair) => {
        const [key, value] = pair.split('=');
        const v = value ?? '';
        const val = secretKeys.includes(key.toLocaleLowerCase()) ? SecureString.from(v, config) : v;
        return [key, val];
      });
  }

  static factory(config: SecureConfig): (value: string) => SecureConnectionString {
    return (value: string) => SecureConnectionString.from(value, config);
  }

  public static from<T extends string | null | undefined>(value: T, config: SecureConfig): T extends string ? SecureConnectionString : T {
    if (value === null) {
      return null as T extends string ? SecureConnectionString : T;
    }
    if (value === undefined) {
      return undefined as T extends string ? SecureConnectionString : T;
    }
    return new SecureConnectionString(value, config) as T extends string ? SecureConnectionString : T;
  }

  public override toString(): string {
    return this.#data.map(([key, value]) => `${key}=${value}`).join(';');
  }

  public override toJSON(): object {
    return Object.fromEntries(this.#data);
  }

  public override [util.inspect.custom](depth: number, options: InspectOptions, inspect: InspectFunction): string {
    if (depth < 0) {
      return '[SecureConnectionString]';
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth == null ? null : options.depth - 1,
    });
    return inspect(this.toJSON(), newOptions);
  }
}

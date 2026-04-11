import { defaultSecureKeys } from './defaults';
import { EncryptedValue } from './EncryptedValue';
import type { ISecureFactory } from './interfaces';
import { SecureConnectionString } from './SecureConnectionString';
import { SecureString } from './SecureString';
import { SecureURL } from './SecureURL';
import type { IEncryptionProvider, SecureConfig } from './types';

export const defaultEncryptionProvider: IEncryptionProvider = {
  encrypt: (value: string) => new EncryptedValue(value),
};

export const createFactory = (options?: Partial<SecureConfig>): ISecureFactory => {
  const config: SecureConfig = {
    secret: options?.secret ?? null,
    encryptionProvider: options?.encryptionProvider ?? defaultEncryptionProvider,
    secretKeys: options?.secretKeys ?? defaultSecureKeys,
  };

  return {
    string: SecureString.factory(config),
    connectionString: SecureConnectionString.factory(config),
    url: SecureURL.factory(config),
  };
};

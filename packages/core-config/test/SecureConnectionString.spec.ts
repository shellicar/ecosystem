import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { defaultSecureKeys } from '../src';
import { defaultEncryptionProvider } from '../src/createFactory';
import { SecureConnectionString } from '../src/SecureConnectionString';
import type { SecureConfig } from '../src/types';

describe('SecureConnectionString', () => {
  const defaultConfig: SecureConfig = {
    encryptionProvider: defaultEncryptionProvider,
    secretKeys: defaultSecureKeys,
    secret: null,
  };

  it('toString hashes the secret', () => {
    const connectionString = 'A=B;C=D;SharedAccessKey=F';
    const expected = 'A=B;C=D;SharedAccessKey=sha256:f67ab10ad4e4c53121b6a5fe4da9c10ddee905b978d3788d2723d7bfacbe28a9';

    const secureConnectionString = SecureConnectionString.from(connectionString, defaultConfig);

    const actual = secureConnectionString.toString();

    expect(actual).toBe(expected);
  });

  it('toJSON hashes the secret', () => {
    const connectionString = 'A=B;C=D;SharedAccessKey=F';
    const expected = JSON.stringify({
      A: 'B',
      C: 'D',
      SharedAccessKey: 'sha256:f67ab10ad4e4c53121b6a5fe4da9c10ddee905b978d3788d2723d7bfacbe28a9',
    });

    const secureConnectionString = SecureConnectionString.from(connectionString, defaultConfig);

    const actual = JSON.stringify(secureConnectionString);

    expect(actual).toBe(expected);
  });

  it('inspect hashes the secret', () => {
    const connectionString = 'A=B;C=D;SharedAccessKey=F';
    const expected = inspect({
      A: 'B',
      C: 'D',
      SharedAccessKey: 'sha256:f67ab10ad4e4c53121b6a5fe4da9c10ddee905b978d3788d2723d7bfacbe28a9',
    });

    const secureConnectionString = SecureConnectionString.from(connectionString, defaultConfig);

    const actual = inspect(secureConnectionString);

    expect(actual).toBe(expected);
  });

  it('can get original value', () => {
    const connectionString = 'A=B;C=D;SharedAccessKey=F';
    const expected = 'A=B;C=D;SharedAccessKey=F';

    const secureConnectionString = SecureConnectionString.from(connectionString, defaultConfig);

    const actual = secureConnectionString.secretValue;

    expect(actual).toBe(expected);
  });

  it('can specify secret keys', () => {
    const connectionString = 'A=B;C=D;MySecretKey=F';
    const expected = 'A=B;C=D;MySecretKey=sha256:f67ab10ad4e4c53121b6a5fe4da9c10ddee905b978d3788d2723d7bfacbe28a9';

    const secureConnectionString = SecureConnectionString.from(connectionString, {
      ...defaultConfig,
      secretKeys: ['MySecretKey'],
    });

    const actual = secureConnectionString.toString();

    expect(actual).toBe(expected);
  });

  it('keys are case insensitive', () => {
    const connectionString = 'A=B;C=D;SHAREDACCESSKEY=F';
    const expected = 'A=B;C=D;SHAREDACCESSKEY=sha256:f67ab10ad4e4c53121b6a5fe4da9c10ddee905b978d3788d2723d7bfacbe28a9';

    const secureConnectionString = SecureConnectionString.from(connectionString, defaultConfig);

    const actual = secureConnectionString.toString();

    expect(actual).toBe(expected);
  });

  it('can use secret key', () => {
    const connectionString = 'A=B;C=D;SharedAccessKey=password';
    const expected = 'A=B;C=D;SharedAccessKey=hs256:7055faebf30a41341bb8d043f6a3a6a18f051f6b30ce6c7b16f7276fe4fdaae7';
    const secureConnectionString = SecureConnectionString.from(connectionString, {
      ...defaultConfig,
      secret: 'hello',
    });

    const actual = secureConnectionString.toString();
    expect(actual).toBe(expected);
  });
});

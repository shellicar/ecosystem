import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { defaultSecureKeys } from '../src';
import { defaultEncryptionProvider } from '../src/createFactory';
import { SecureString } from '../src/SecureString';
import type { SecureConfig } from '../src/types';

describe('SecureString', () => {
  const defaultConfig: SecureConfig = {
    encryptionProvider: defaultEncryptionProvider,
    secretKeys: defaultSecureKeys,
    secret: null,
  };

  it('toString hashes the secret', () => {
    const secret = 'hello';
    const expected = 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

    const secureString = SecureString.from(secret, defaultConfig);
    const actual = secureString.toString();

    expect(actual).toBe(expected);
  });

  it('toJSON hashes the secret', () => {
    const secret = 'hello';
    const expected = '"sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"';

    const secureString = SecureString.from(secret, defaultConfig);
    const actual = JSON.stringify(secureString);

    expect(actual).toBe(expected);
  });

  it('inspect hashes the secret', () => {
    const secret = 'hello';
    const expected = "'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'";

    const secureString = SecureString.from(secret, defaultConfig);
    const actual = inspect(secureString);

    expect(actual).toBe(expected);
  });

  it('can get original value', () => {
    const secret = 'hello';
    const expected = 'hello';

    const secureString = SecureString.from(secret, defaultConfig);
    const actual = secureString.secretValue;

    expect(actual).toBe(expected);
  });

  it('can use secret key', () => {
    const secret = 'password';
    const expected = 'hs256:7055faebf30a41341bb8d043f6a3a6a18f051f6b30ce6c7b16f7276fe4fdaae7';

    const secureString = SecureString.from(secret, {
      ...defaultConfig,
      secret: 'hello',
    });
    const actual = secureString.toString();

    expect(actual).toBe(expected);
  });
});

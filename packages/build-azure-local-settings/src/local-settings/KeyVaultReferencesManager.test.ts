import { describe, expect, it, vi } from 'vitest';

// Mock Azure SDK to avoid credential instantiation
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: class {},
}));
vi.mock('@azure/keyvault-secrets', () => ({
  SecretClient: class {},
}));

const { KeyVaultReferencesManager } = await import('./KeyVaultReferencesManager');

const createManager = (): InstanceType<typeof KeyVaultReferencesManager> => new KeyVaultReferencesManager();

describe('KeyVaultReferencesManager', () => {
  describe('parseSecret', () => {
    it('returns null for undefined value', () => {
      const expected = null;
      const manager = createManager();

      const actual = manager.parseSecret('key', undefined);

      expect(actual).toBe(expected);
    });

    it('returns null for non-key-vault value', () => {
      const expected = null;
      const manager = createManager();

      const actual = manager.parseSecret('key', 'plain-value');

      expect(actual).toBe(expected);
    });

    it('parses SecretUri format', () => {
      const expected = 'my-secret';
      const manager = createManager();
      const value = '@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/my-secret)';

      const actual = manager.parseSecret('key', value)?.name;

      expect(actual).toBe(expected);
    });

    it('parses SecretUri with version', () => {
      const expected = 'abc123';
      const manager = createManager();
      const value = '@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/my-secret/abc123)';

      const actual = manager.parseSecret('key', value)?.version;

      expect(actual).toBe(expected);
    });

    it('parses VaultName/SecretName format', () => {
      const expected = 'my-secret';
      const manager = createManager();
      const value = '@Microsoft.KeyVault(VaultName=myvault;SecretName=my-secret)';

      const actual = manager.parseSecret('key', value)?.name;

      expect(actual).toBe(expected);
    });

    it('parses VaultName/SecretName with version', () => {
      const expected = 'v1';
      const manager = createManager();
      const value = '@Microsoft.KeyVault(VaultName=myvault;SecretName=my-secret;SecretVersion=v1)';

      const actual = manager.parseSecret('key', value)?.version;

      expect(actual).toBe(expected);
    });

    it('constructs vault URI from VaultName', () => {
      const expected = 'https://myvault.vault.azure.net/';
      const manager = createManager();
      const value = '@Microsoft.KeyVault(VaultName=myvault;SecretName=my-secret)';

      const actual = manager.parseSecret('key', value)?.uri.toString();

      expect(actual).toBe(expected);
    });

    it('returns null for invalid key vault reference format', () => {
      const expected = null;
      const manager = createManager();
      const value = '@Microsoft.KeyVault(InvalidFormat)';

      const actual = manager.parseSecret('key', value);

      expect(actual).toBe(expected);
    });
  });

  describe('parseVaultReference', () => {
    it('parses SecretUri reference', () => {
      const expected = 'my-secret';
      const manager = createManager();

      const actual = manager.parseVaultReference('SecretUri=https://myvault.vault.azure.net/secrets/my-secret')?.name;

      expect(actual).toBe(expected);
    });

    it('returns null when neither SecretUri nor VaultName present', () => {
      const expected = null;
      const manager = createManager();

      const actual = manager.parseVaultReference('SomethingElse=value');

      expect(actual).toBe(expected);
    });

    it('returns null when VaultName present but SecretName missing', () => {
      const expected = null;
      const manager = createManager();

      const actual = manager.parseVaultReference('VaultName=myvault');

      expect(actual).toBe(expected);
    });
  });

  describe('getValueFromVaultReference', () => {
    it('extracts value for existing key', () => {
      const expected = 'myvault';
      const manager = createManager();

      const actual = manager.getValueFromVaultReference('VaultName', 'VaultName=myvault;SecretName=secret');

      expect(actual).toBe(expected);
    });

    it('extracts last key value in reference string', () => {
      const expected = 'secret';
      const manager = createManager();

      const actual = manager.getValueFromVaultReference('SecretName', 'VaultName=myvault;SecretName=secret');

      expect(actual).toBe(expected);
    });

    it('returns null for missing key', () => {
      const expected = null;
      const manager = createManager();

      const actual = manager.getValueFromVaultReference('Missing', 'VaultName=myvault');

      expect(actual).toBe(expected);
    });
  });
});

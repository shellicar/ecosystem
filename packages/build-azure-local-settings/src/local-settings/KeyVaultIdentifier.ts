/**
 * Port of KeyVaultIdentifier from Azure SDK for .NET
 * @see https://github.com/Azure/azure-sdk-for-net/blob/3dad5181b332bf12d5298810f73347ee1bc9980b/sdk/keyvault/Azure.Security.KeyVault.Shared/src/KeyVaultIdentifier.cs
 */

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Ported from sdk/keyvault/Azure.Security.KeyVault.Shared/src/KeyVaultIdentifier.cs
export class KeyVaultIdentifier {
  public static readonly SecretsCollection = 'secrets';
  public static readonly KeysCollection = 'keys';
  public static readonly CertificatesCollection = 'certificates';

  public id: URL;
  public vaultUri: URL;
  public name: string;
  public collection: string;
  public version: string | null;

  constructor() {
    // Initialize with defaults - will be set by static methods
    this.id = new URL('http://localhost');
    this.vaultUri = new URL('http://localhost');
    this.name = '';
    this.collection = '';
    this.version = null;
  }

  public static parse(id: URL): KeyVaultIdentifier {
    if (id === null || id === undefined) {
      throw new Error('id cannot be null');
    }

    const result = KeyVaultIdentifier.tryParse(id);
    if (!result.success) {
      throw new Error(`Invalid ObjectIdentifier: ${id}. Bad number of segments: ${id.pathname.split('/').length}`);
    }
    // biome-ignore lint/style/noNonNullAssertion: tryParse sets identifier when success is true, guarded by the throw above
    return result.identifier!;
  }

  public static parseWithCollection(id: URL, collection: string): KeyVaultIdentifier {
    const identifier = KeyVaultIdentifier.parse(id);
    if (identifier.collection.toLowerCase() !== collection.toLowerCase()) {
      throw new Error(`Invalid ObjectIdentifier: ${id}. segment [1] should be '${collection}/', found '${identifier.collection}'`);
    }
    return identifier;
  }

  public static tryParse(id: URL | null): { success: boolean; identifier?: KeyVaultIdentifier } {
    if (id === null) {
      return { success: false };
    }

    // We expect an identifier with either 3 or 4 segments: host + collection + name [+ version]
    const segments = id.pathname.split('/');
    if (segments.length !== 3 && segments.length !== 4) {
      return { success: false };
    }

    const identifier = new KeyVaultIdentifier();
    identifier.id = id;
    identifier.vaultUri = new URL(`${id.protocol}//${id.host}`);
    // biome-ignore lint/style/noNonNullAssertion: length check above guarantees segments[1..3] exist
    identifier.collection = segments[1]!.replace(/\/$/, ''); // Trim '/'
    // biome-ignore lint/style/noNonNullAssertion: length check above guarantees segments[1..3] exist
    identifier.name = segments[2]!.replace(/\/$/, ''); // Trim '/'
    // biome-ignore lint/style/noNonNullAssertion: length check above guarantees segments[3] exists when length is 4
    identifier.version = segments.length === 4 ? segments[3]!.replace(/\/$/, '') : null; // TrimEnd '/'

    return { success: true, identifier };
  }
}

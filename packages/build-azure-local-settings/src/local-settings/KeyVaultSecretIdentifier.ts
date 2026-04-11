/**
 * Port of KeyVaultSecretIdentifier from Azure SDK for .NET
 * @see https://github.com/Azure/azure-sdk-for-net/blob/3dad5181b332bf12d5298810f73347ee1bc9980b/sdk/keyvault/Azure.Security.KeyVault.Secrets/src/KeyVaultSecretIdentifier.cs
 */

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { KeyVaultIdentifier } from './KeyVaultIdentifier';

/**
 * Information about a KeyVault Secret parsed from a URL.
 * You can use this information when calling methods of a SecretClient.
 */
export class KeyVaultSecretIdentifier {
  /**
   * Gets the source URL passed to KeyVaultSecretIdentifier constructor.
   */
  public sourceId: URL;

  /**
   * Gets the URL of the Key Vault.
   */
  public vaultUri: URL;

  /**
   * Gets the name of the secret.
   */
  public name: string;

  /**
   * Gets the optional version of the secret.
   */
  public version: string | null;

  /**
   * Creates a new instance of the KeyVaultSecretIdentifier class.
   * @param id The URL to a secret or deleted secret.
   * @throws Error if id is not a valid Key Vault secret ID.
   */
  public constructor(id: URL) {
    if (id === null || id === undefined) {
      throw new Error('id cannot be null');
    }

    const result = KeyVaultIdentifier.tryParse(id);
    if (result.success && result.identifier) {
      this.sourceId = id;
      this.vaultUri = result.identifier.vaultUri;
      this.name = result.identifier.name;
      this.version = result.identifier.version;
    } else {
      throw new Error(`${id} is not a valid secret ID`);
    }
  }
}

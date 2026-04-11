/**
 * Port of azure-functions-core-tools reading from local.settings.json
 * @see https://github.com/Azure/azure-functions-core-tools/blob/b367a5155d7bf299c4719dc37051082ae8ddebaf/src/Cli/func/Common/KeyVaultReferencesManager.cs
 */

// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { KeyVaultSecretIdentifier } from './KeyVaultSecretIdentifier';

export class KeyVaultReferencesManager {
  private static readonly VaultUriSuffix = 'vault.azure.net';
  private static readonly _basicKeyVaultReferenceRegex = /^@Microsoft\.KeyVault\((?<ReferenceString>.*)\)$/;

  private readonly _clients = new Map<string, SecretClient>();
  private readonly _credential: TokenCredential = new DefaultAzureCredential(); // CodeQL [SM05137] This is never deployed to production, only used in CLI context in a local dev environment.

  public async resolveKeyVaultReferences(settings: { [key: string]: string | undefined }): Promise<void> {
    const keys = Object.keys(settings);

    for (const key of keys) {
      try {
        const keyVaultValue = await this.getSecretValue(key, settings[key]);
        if (keyVaultValue != null) {
          settings[key] = keyVaultValue;
        }
      } catch {}
    }
  }

  private async getSecretValue(key: string, value: string | undefined): Promise<string | null> {
    const result = this.parseSecret(key, value);

    if (result != null) {
      const client = this.getSecretClient(result.uri);
      const secret = await client.getSecret(result.name, result.version ? { version: result.version } : undefined);
      // biome-ignore lint/style/noNonNullAssertion: Key Vault SDK types value as optional but a successfully retrieved secret always has a value in local dev context
      return secret.value!;
    }

    return null;
  }

  public parseSecret(key: string, value: string | undefined): KeyVaultReferencesManager.ParseSecretResult | null {
    // If the value is null, then we return nothing, as the subsequent call to
    // UpdateEnvironmentVariables(settings) will log to the user that the setting
    // is skipped. We check here, because Regex.Match throws when supplied with a
    // null value.
    if (value == null) {
      return null;
    }

    // Determine if the secret value is attempting to use a key vault reference
    const keyVaultReferenceMatch = KeyVaultReferencesManager._basicKeyVaultReferenceRegex.exec(value);
    if (keyVaultReferenceMatch?.groups) {
      const referenceString = keyVaultReferenceMatch.groups['ReferenceString'];
      let result: KeyVaultReferencesManager.ParseSecretResult | null = null;
      try {
        if (referenceString != null) {
          result = this.parseVaultReference(referenceString);
        }
      } catch {
        // ignore and show warning below
      }

      // If we detect that a key vault reference was attempted, but did not match any of
      // the supported formats, we write a warning to the console.
      if (result == null) {
        console.warn(`Unable to parse the Key Vault reference for setting: ${key}`);
      }

      return result;
    }

    return null;
  }

  public parseVaultReference(vaultReference: string): KeyVaultReferencesManager.ParseSecretResult | null {
    const secretUriString = this.getValueFromVaultReference('SecretUri', vaultReference);
    if (secretUriString && secretUriString.length > 0) {
      const secretUri = new URL(secretUriString);
      const secretIdentifier = new KeyVaultSecretIdentifier(secretUri);
      return new KeyVaultReferencesManager.ParseSecretResult(secretIdentifier.vaultUri, secretIdentifier.name, secretIdentifier.version);
    }

    const vaultName = this.getValueFromVaultReference('VaultName', vaultReference);
    const secretName = this.getValueFromVaultReference('SecretName', vaultReference);
    const version = this.getValueFromVaultReference('SecretVersion', vaultReference);
    if (vaultName && vaultName.length > 0 && secretName && secretName.length > 0) {
      return new KeyVaultReferencesManager.ParseSecretResult(new URL(`https://${vaultName}.${KeyVaultReferencesManager.VaultUriSuffix}`), secretName, version);
    }

    return null;
  }

  public getValueFromVaultReference(key: string, vaultReference: string): string | null {
    const regex = new RegExp(key + '=(?<Value>[^;]+)(;|$)');
    const match = regex.exec(vaultReference);
    if (match?.groups) {
      return match.groups['Value'] ?? null;
    }

    return null;
  }

  private getSecretClient(vaultUri: URL): SecretClient {
    const uriString = vaultUri.toString();
    let client = this._clients.get(uriString);
    if (!client) {
      client = new SecretClient(uriString, this._credential);
      this._clients.set(uriString, client);
    }
    return client;
  }
}

export namespace KeyVaultReferencesManager {
  export class ParseSecretResult {
    public uri: URL;
    public name: string;
    public version: string | null;

    constructor(uri: URL, name: string, version: string | null) {
      this.uri = uri;
      this.name = name;
      this.version = version;
    }
  }
}

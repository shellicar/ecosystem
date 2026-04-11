/**
 * Port of StartHostAction from Azure Functions Core Tools (partial)
 * @see https://github.com/Azure/azure-functions-core-tools/blob/b367a5155d7bf299c4719dc37051082ae8ddebaf/src/Cli/func/Actions/HostActions/StartHostAction.cs
 */

import { env } from 'node:process';
import { KeyVaultReferencesManager } from './KeyVaultReferencesManager';
import { SecretsManager } from './SecretsManager';

export class StartHostAction {
  private readonly _secretsManager: SecretsManager;
  private readonly _keyVaultReferencesManager: KeyVaultReferencesManager;

  constructor() {
    this._secretsManager = new SecretsManager();
    this._keyVaultReferencesManager = new KeyVaultReferencesManager();
  }

  public async buildWebHost(): Promise<void> {
    const settings = await this.getConfigurationSettings('', new URL('http://localhost:7071'));
    await this._keyVaultReferencesManager.resolveKeyVaultReferences(settings);
    this.updateEnvironmentVariables(settings);
  }

  private async getConfigurationSettings(scriptPath: string, uri: URL): Promise<Record<string, string>> {
    const settings = this._secretsManager.getSecrets();
    settings['WebsiteHostname'] = uri.host;

    const connectionStrings = this._secretsManager.getConnectionStrings();
    for (const connectionString of connectionStrings) {
      settings[`ConnectionStrings:${connectionString.name}`] = connectionString.value;
    }
    settings['AzureWebJobsScriptRoot'] = scriptPath;

    const environment: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') {
        environment[key] = value;
      }
    }

    if (settings['AZURE_FUNCTIONS_ENVIRONMENT']) {
      const oldValue = settings['AZURE_FUNCTIONS_ENVIRONMENT'];
      console.warn(`AZURE_FUNCTIONS_ENVIRONMENT already exists with value '${oldValue}', overriding to 'Development'.`);
    }

    settings['AZURE_FUNCTIONS_ENVIRONMENT'] = 'Development';

    return settings;
  }

  private updateEnvironmentVariables(secrets: Record<string, string>): void {
    for (const [key, value] of Object.entries(secrets)) {
      if (!key) {
        console.warn('Skipping local setting with empty key.');
      } else if (env[key] !== undefined) {
        console.warn(`Skipping '${key}' from local settings as it's already defined in current environment variables.`);
      } else if (value) {
        env[key] = value;
      } else if (value === '') {
        env[key] = '';
      } else {
        console.warn(`Skipping '${key}' because value is null`);
      }
    }
  }
}

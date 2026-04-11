/**
 * Port of SecretsManager from Azure Functions Core Tools
 * @see https://github.com/Azure/azure-functions-core-tools/blob/b367a5155d7bf299c4719dc37051082ae8ddebaf/src/Cli/func/Common/SecretsManager.cs
 */

import { join } from 'node:path';
import { AppSettingsFile } from './AppSettingsFile';

export class SecretsManager {
  private static _lazySettings: AppSettingsFile | null = null;

  private static get Settings(): AppSettingsFile {
    if (!SecretsManager._lazySettings) {
      SecretsManager._lazySettings = new AppSettingsFile(SecretsManager.AppSettingsFilePath);
    }
    return SecretsManager._lazySettings;
  }

  public static get AppSettingsFilePath(): string {
    const secretsFile = 'local.settings.json';
    const rootPath = process.cwd();
    const secretsFilePath = join(rootPath, secretsFile);

    console.log(`'${secretsFile}' found in root directory (${rootPath}).`);
    return secretsFilePath;
  }

  public static get AppSettingsFileName(): string {
    return 'local.settings.json';
  }

  public getSecrets(refreshSecrets = false): Record<string, string> {
    if (refreshSecrets) {
      return new AppSettingsFile(SecretsManager.AppSettingsFilePath).getValues();
    }

    return SecretsManager.Settings.getValues();
  }

  public getConnectionStrings(): any[] {
    return SecretsManager.Settings.getConnectionStrings();
  }
}

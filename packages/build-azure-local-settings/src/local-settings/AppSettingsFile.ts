/**
 * Port of AppSettingsFile from Azure Functions Core Tools
 * @see https://github.com/Azure/azure-functions-core-tools/blob/b367a5155d7bf299c4719dc37051082ae8ddebaf/src/Cli/func/Common/AppSettingsFile.cs
 */

import { readFileSync } from 'node:fs';

interface LocalSettingsJson {
  IsEncrypted?: boolean;
  Values?: Record<string, string>;
  ConnectionStrings?: Record<string, any>;
  Host?: any;
}

export class AppSettingsFile {
  public isEncrypted: boolean;
  public values: Record<string, string>;
  public connectionStrings: Record<string, any>;
  public host: any;

  constructor(private filePath: string) {
    this.values = {};
    this.connectionStrings = {};
    this.isEncrypted = true;

    try {
      const content = readFileSync(this.filePath, 'utf8');
      const appSettings: LocalSettingsJson = JSON.parse(content);

      this.isEncrypted = appSettings.IsEncrypted ?? true;
      this.values = appSettings.Values ?? {};
      this.connectionStrings = appSettings.ConnectionStrings ?? {};
      this.host = appSettings.Host ?? {};
    } catch (ex) {
      console.warn(`Failed to read app settings file at '${this.filePath}'. Ensure it is a valid JSON file.`, ex);
      this.values = {};
      this.connectionStrings = {};
      this.isEncrypted = true;
    }
  }

  public getValues(): Record<string, string> {
    if (this.isEncrypted) {
      throw new Error('Encrypted settings are not supported in this TypeScript port.');
    }
    return { ...this.values };
  }

  public getConnectionStrings(): any[] {
    return [];
  }
}

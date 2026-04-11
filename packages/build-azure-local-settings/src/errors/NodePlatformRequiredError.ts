export class NodePlatformRequiredError extends Error {
  constructor(platform: string | undefined) {
    super(`loadLocalSettings requires platform: 'node', but platform is '${platform ?? 'undefined'}'. Either set platform: 'node' or disable loadLocalSettings.`);
    this.name = 'NodePlatformRequiredError';
  }
}

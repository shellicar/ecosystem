export class UnsupportedPlatformError extends Error {
  constructor(platform: string | undefined) {
    super(`Unsupported platform: ${platform ?? 'undefined'}. Only node or neutral are supported when format is not set.`);
    this.name = 'UnsupportedPlatformError';
  }
}

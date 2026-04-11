export class UnsupportedFormatError extends Error {
  constructor(format: string) {
    super(`Unsupported format: ${format}. Only cjs or esm are supported.`);
    this.name = 'UnsupportedFormatError';
  }
}

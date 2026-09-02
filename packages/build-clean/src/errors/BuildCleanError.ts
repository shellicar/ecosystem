export abstract class BuildCleanError extends Error {
  public readonly kind: string;

  protected constructor(kind: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.kind = kind;
    this.name = new.target.name;
  }
}

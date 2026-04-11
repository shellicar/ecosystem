export abstract class GraphQLLoadError extends Error {
  public readonly kind: string;

  protected constructor(kind: string) {
    super();
    this.kind = kind;
  }
}

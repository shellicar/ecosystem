export abstract class IAbstract {}
export class Concrete implements IAbstract {}

export class Redis {
  constructor(private readonly options: { port: number; host: string }) {}
}

export abstract class IRedisOptions {
  abstract readonly port: number;
  abstract readonly host: string;
}

export abstract class IDependency {
  public abstract test(): string;
}
export class Dependency implements IDependency {
  public test(): string {
    return 'hello';
  }
}

export abstract class IHealthCheck {
  public abstract healthy(): Promise<boolean>;
}

export class HealthCheck1 implements IHealthCheck {
  public async healthy(): Promise<boolean> {
    return true;
  }
}
export class HealthCheck2 implements IHealthCheck {
  public async healthy(): Promise<boolean> {
    return false;
  }
}

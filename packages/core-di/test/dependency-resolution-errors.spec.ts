import { throws } from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, ServiceCreationError } from '../src';

abstract class IConfigOptions {
  abstract getConnectionString(): string;
}

abstract class IDatabaseService {
  abstract connect(): void;
}

abstract class IUserService {
  abstract getUsers(): string[];
}

class ConfigOptions implements IConfigOptions {
  constructor() {
    throw new Error('Missing required environment variable DATABASE_URL');
  }

  getConnectionString(): string {
    return 'connection-string';
  }
}

class DatabaseService implements IDatabaseService {
  @dependsOn(IConfigOptions) private readonly options!: IConfigOptions;

  connect(): void {
    const connectionString = this.options.getConnectionString();
  }
}

class UserService implements IUserService {
  @dependsOn(IDatabaseService) private readonly db!: IDatabaseService;

  getUsers(): string[] {
    return ['user1', 'user2'];
  }
}

describe('Dependency Resolution Error Handling', () => {
  it('throws a ServiceCreationError when a dependency fails to construct', () => {
    const provider = createProvider();

    const resolve = () => provider.resolve(IUserService);

    throws(resolve, ServiceCreationError);
  });

  it('contains error hierarchy', () => {
    const provider = createProvider();

    const resolve = () => provider.resolve(IUserService);

    try {
      resolve();
    } catch (err) {
      if (err instanceof ServiceCreationError) {
        expect(err.identifier).toBe(IUserService);
        expect(err.implementation).toBe(UserService);
        console.log('outer', err);
        if (err.innerError instanceof ServiceCreationError) {
          const inner = err.innerError;
          console.log('inner', inner);
          return true;
        }
      }
      return false;
    }
  });

  it('does not wrap ServiceCreationError when it already identifies the requested service', () => {
    const services = createServiceCollection();

    abstract class IDirectFailingService {
      abstract doSomething(): void;
    }

    class DirectFailingService implements IDirectFailingService {
      constructor() {
        throw new Error('Direct service failure');
      }

      doSomething(): void {}
    }

    services.register(IDirectFailingService).to(DirectFailingService);
    const provider = services.buildProvider();

    try {
      provider.resolve(IDirectFailingService);
      throw new Error('Expected resolution to fail');
    } catch (err) {
      if (err instanceof ServiceCreationError) {
        expect(err.identifier).toBe(IDirectFailingService);
        expect(err.implementation).toBe(DirectFailingService);

        expect(err.innerError).toBeInstanceOf(Error);
        expect(err.innerError).not.toBeInstanceOf(ServiceCreationError);
        expect(err.innerError?.message).toBe('Direct service failure');
        return;
      }
      throw new Error('Expected ServiceCreationError');
    }
  });

  it('preserves full error chain in deep dependency hierarchy', () => {
    const services = createServiceCollection();

    abstract class ILevel5 {
      abstract method5(): string;
    }
    abstract class ILevel4 {
      abstract method4(): string;
    }
    abstract class ILevel3 {
      abstract method3(): string;
    }
    abstract class ILevel2 {
      abstract method2(): string;
    }
    abstract class ILevel1 {
      abstract method1(): string;
    }

    class Level5 implements ILevel5 {
      constructor() {
        throw new Error('Level5 configuration failed');
      }
      method5(): string {
        return 'level5';
      }
    }

    class Level4 implements ILevel4 {
      @dependsOn(ILevel5) private level5!: ILevel5;
      method4(): string {
        return this.level5.method5();
      }
    }

    class Level3 implements ILevel3 {
      @dependsOn(ILevel4) private level4!: ILevel4;
      method3(): string {
        return this.level4.method4();
      }
    }

    class Level2 implements ILevel2 {
      @dependsOn(ILevel3) private level3!: ILevel3;
      method2(): string {
        return this.level3.method3();
      }
    }

    class Level1 implements ILevel1 {
      @dependsOn(ILevel2) private level2!: ILevel2;
      method1(): string {
        return this.level2.method2();
      }
    }

    services.register(ILevel5).to(Level5);
    services.register(ILevel4).to(Level4);
    services.register(ILevel3).to(Level3);
    services.register(ILevel2).to(Level2);
    services.register(ILevel1).to(Level1);

    const provider = services.buildProvider();

    try {
      provider.resolve(ILevel1);
      throw new Error('Expected resolution to fail');
    } catch (err) {
      if (err instanceof ServiceCreationError) {
        const expectedErrorChain = [
          { identifier: ILevel1, implementation: Level1 },
          { identifier: ILevel2, implementation: Level2 },
          { identifier: ILevel3, implementation: Level3 },
          { identifier: ILevel4, implementation: Level4 },
          { identifier: ILevel5, implementation: Level5 },
        ];

        let currentError = err;
        for (let i = 0; i < expectedErrorChain.length; i++) {
          const expected = expectedErrorChain[i];
          expect(currentError).toBeInstanceOf(ServiceCreationError);
          expect(currentError.identifier).toBe(expected.identifier);
          expect(currentError.implementation).toBe(expected.implementation);

          if (i === expectedErrorChain.length - 1) {
            expect(currentError.innerError).toBeInstanceOf(Error);
            expect(currentError.innerError).not.toBeInstanceOf(ServiceCreationError);
            expect(currentError.message).toContain('Level5 configuration failed');
            expect(currentError.message).toContain('ILevel5 (Level5)');
          } else {
            expect(currentError.innerError).toBeInstanceOf(ServiceCreationError);
            currentError = currentError.innerError as ServiceCreationError<any>;
          }
        }
        return;
      }
      throw new Error('Expected ServiceCreationError');
    }
  });
});

const createProvider = () => {
  const services = createServiceCollection();
  services.register(IConfigOptions).to(ConfigOptions);
  services.register(IDatabaseService).to(DatabaseService);
  services.register(IUserService).to(UserService);
  const provider = services.buildProvider();
  return provider;
};

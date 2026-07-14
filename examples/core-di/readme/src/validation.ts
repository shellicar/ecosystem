import { equal, ok, throws } from 'node:assert/strict';
import { createServiceCollection, dependsOn, ValidationError, ValidationProblemKind } from '@shellicar/core-di';

abstract class IRepository {}
class Repository implements IRepository {}

abstract class IService {}
class Service implements IService {
  @dependsOn(IRepository) public readonly repository!: IRepository;
}

// validate() reads the static dependency graph and reports problems without
// throwing — cheap to run in CI. A singleton that depends on a shorter-lived
// scoped service is a captive dependency.
const services = createServiceCollection();
services.register(Repository).as(IRepository).scoped();
services.register(Service).as(IService).singleton();

const report = services.validate();
equal(report.valid, false);
ok(report.problems.some((p) => p.kind === ValidationProblemKind.CaptiveDependency));

// buildProvider stays lenient by default; opt in with { validate: true } to
// fail fast, throwing a ValidationError that carries the problems.
throws(() => services.buildProvider({ validate: true }), ValidationError);

// Sound wiring validates clean.
const sound = createServiceCollection();
sound.register(Repository).as(IRepository).singleton();
sound.register(Service).as(IService).singleton();
ok(sound.validate().valid);

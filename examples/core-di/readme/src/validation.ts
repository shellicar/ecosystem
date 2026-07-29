import { equal, ok, throws } from 'node:assert/strict';
import { CaptivePolicy, createServiceCollection, dependsOn, ValidationError, ValidationProblemKind } from '@shellicar/core-di';

abstract class IRepository {}
class Repository implements IRepository {}

abstract class IService {}
class Service implements IService {
  @dependsOn(IRepository) public readonly repository!: IRepository;
}

// validate() reads the static dependency graph and reports problems without
// throwing, cheap to run in CI. A singleton that depends on a shorter-lived
// scoped service is a captive dependency. Under the default policy that is a
// warning: worth looking at, but the report stays valid and the build goes ahead.
const services = createServiceCollection();
services.register(Repository).as(IRepository).scoped();
services.register(Service).as(IService).singleton();

const report = services.validate();
equal(report.valid, true);
ok(report.warnings.some((p) => p.kind === ValidationProblemKind.CaptiveDependency));

// The same wiring under CaptivePolicy.Strict is an error instead. Errors are what
// make a report invalid, and what { validate: true } refuses to build.
const strict = createServiceCollection({ captivePolicy: CaptivePolicy.Strict });
strict.register(Repository).as(IRepository).scoped();
strict.register(Service).as(IService).singleton();

const strictReport = strict.validate();
equal(strictReport.valid, false);
ok(strictReport.errors.some((p) => p.kind === ValidationProblemKind.CaptiveDependency));

// buildProvider stays lenient by default; opt in with { validate: true } to fail
// fast, throwing a ValidationError that carries the errors.
throws(() => strict.buildProvider({ validate: true }), ValidationError);

// Sound wiring validates clean.
const sound = createServiceCollection();
sound.register(Repository).as(IRepository).singleton();
sound.register(Service).as(IService).singleton();
ok(sound.validate().valid);

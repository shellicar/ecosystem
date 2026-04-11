import { ErrorPolicy } from '../enums';

export const resolveErrorPolicy = (options: { errorPolicy?: ErrorPolicy; ignoreErrors?: boolean }): ErrorPolicy => {
  if (options.errorPolicy != null) {
    return options.errorPolicy;
  }
  if (options.ignoreErrors === true) {
    return ErrorPolicy.Ignore;
  }
  return ErrorPolicy.Abort;
};

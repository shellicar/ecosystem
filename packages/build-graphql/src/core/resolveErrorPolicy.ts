import { ErrorPolicy } from '../enums';

export const resolveErrorPolicy = (options: { errorPolicy?: ErrorPolicy }): ErrorPolicy => {
  return options.errorPolicy ?? ErrorPolicy.Abort;
};

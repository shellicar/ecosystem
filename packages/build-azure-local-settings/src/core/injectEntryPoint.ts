import type { BuildOptions } from 'esbuild';

export const injectEntryPoint = (initialOptions: BuildOptions, entryName: string, virtualModuleId: string): void => {
  const entryPoints = initialOptions.entryPoints;

  if (Array.isArray(entryPoints)) {
    initialOptions.entryPoints = [...entryPoints, virtualModuleId];
  } else if (typeof entryPoints === 'object' && entryPoints !== null) {
    initialOptions.entryPoints = {
      ...entryPoints,
      [entryName]: virtualModuleId,
    };
  } else {
    initialOptions.entryPoints = { [entryName]: virtualModuleId };
  }
};

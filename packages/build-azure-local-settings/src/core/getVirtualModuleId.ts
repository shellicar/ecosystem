// Use a path-like format so esbuild uses the basename for output

export const getVirtualModuleId = (entryName: string): string => `virtual:azure-local-settings/${entryName}`;

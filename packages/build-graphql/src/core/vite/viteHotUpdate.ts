import type { ViteDevServer } from 'vite';
import { virtualModuleId } from '../consts';
import { resolveVirtualId } from '../resolveVirtualId';

type ModuleGraph = Pick<ViteDevServer, 'moduleGraph'>['moduleGraph'];

type DevServerDependency = {
  moduleGraph: Pick<ModuleGraph, 'getModuleById' | 'invalidateModule'>;
};

export const handleHotUpdate = async (ctx: { file: string; server: DevServerDependency }) => {
  const { file, server } = ctx;
  if (!file.endsWith('.graphql')) {
    return;
  }

  const gqlMod = server.moduleGraph.getModuleById(`\0${file}`);
  if (gqlMod != null) {
    server.moduleGraph.invalidateModule(gqlMod);
  }

  const typedefsMod = server.moduleGraph.getModuleById(resolveVirtualId(virtualModuleId));
  if (typedefsMod != null) {
    server.moduleGraph.invalidateModule(typedefsMod);
    return [typedefsMod];
  }

  return [];
};

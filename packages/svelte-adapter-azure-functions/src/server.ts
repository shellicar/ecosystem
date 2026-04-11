import 'SHIMS';
import { manifest } from 'MANIFEST';
import { Server } from 'SERVER';

const getInitializedServer = async () => {
  const server = new Server(manifest);
  await server.init({ env: process.env });
  return server;
};

export const serverPromise = getInitializedServer();

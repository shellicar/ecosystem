import type { HttpHandler, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getClientIPFromHeaders, getClientPrincipalFromHeaders, splitCookiesFromHeaders } from './headers';
import { serverPromise } from './server.js';

const toRequest = async (req: HttpRequest) => {
  const { method, headers, url: originalUrl } = req;

  const init: RequestInit = {
    method,
    headers: Object.fromEntries(headers),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  return new Request(originalUrl, init);
};

export const handler: HttpHandler = async (req, context): Promise<HttpResponseInit> => {
  const request = await toRequest(req);
  const server = await serverPromise;

  const ipAddress = getClientIPFromHeaders(request.headers);
  const clientPrincipal = getClientPrincipalFromHeaders(request.headers);

  const response = await server.respond(request, {
    getClientAddress() {
      return ipAddress;
    },
    platform: {
      clientPrincipal,
      context,
    },
  });

  const { headers, cookies } = splitCookiesFromHeaders(response.headers);
  return {
    status: response.status,
    body: response.body,
    headers,
    cookies,
  };
};

import { app } from '@azure/functions';
import { handler } from './handler';

const getAuthLevel = (level: string | undefined) => {
  switch (level) {
    case 'function':
      return 'function';
    case 'admin':
      return 'admin';
    case 'anonymous':
      return 'anonymous';
  }
  return 'anonymous';
};

app.http('server', {
  handler,
  authLevel: getAuthLevel(process.env.SERVER_AUTH_LEVEL),
  route: '{*url}',
  methods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
});

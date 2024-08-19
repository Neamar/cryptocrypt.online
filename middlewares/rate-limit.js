import koaRatelimit from 'koa-ratelimit';
import { isTest } from '../helpers/env.js';

export const rateLimitCrypts = koaRatelimit({
  driver: 'memory',
  db: new Map(),
  duration: 10000,
  errorMessage: 'Wow, easy with the refresh champ!',
  id: (ctx) => ctx.ip,
  max: 10,
  disableHeader: true,
  whitelist: (ctx) => {
    // Only rate limit the /crypts endpoints (which include crypts creation)
    return isTest || !ctx.request.path.startsWith('/crypts');
  },
});

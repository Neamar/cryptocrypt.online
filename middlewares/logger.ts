import type { Middleware } from 'koa';
import type { Logger } from 'pino';

/**
 * Attach pino logger to context
 * Allows ctx.log.info(), ctx.log.error(), etc.
 */
export const attachLogger = (logger: Logger): Middleware => async (ctx, next) => {
  ctx.log = logger;
  await next();
};

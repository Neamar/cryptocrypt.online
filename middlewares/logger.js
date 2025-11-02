/**
 * Attach bunyan logger to context
 * Allows ctx.log.info(), ctx.log.error(), etc.
 */
export const attachLogger = (logger) => async (ctx, next) => {
  ctx.log = logger;
  await next();
};

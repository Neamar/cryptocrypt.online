import { webLogger } from '../helpers/logger.ts';
import { isProd } from '../helpers/env.ts';
import type { Middleware } from 'koa';

/**
 * Request logging middleware using pino
 * Logs incoming requests and outgoing responses with relevant metadata
 */
export const addRequestLogs: Middleware = async (ctx, next) => {
  const start = Date.now();
  const logData: { method: string; path: string; ip?: string; userAgent?: string } = {
    method: ctx.method,
    path: ctx.path,
  };

  // Add IP address to logs in production
  if (isProd) {
    logData.ip = ctx.ip;
  }

  // Add User-Agent to incoming requests in production
  if (isProd) {
    logData.userAgent = ctx.get('user-agent');
  }

  try {
    await next();

    // Log response
    const duration = Date.now() - start;
    const responseData = {
      ...logData,
      status: ctx.status,
      duration,
    };

    // Determine log level based on status code
    if (ctx.status >= 500) {
      webLogger.error(responseData, `${ctx.method} ${ctx.path}`);
    } else if (ctx.status >= 400) {
      webLogger.warn(responseData, `${ctx.method} ${ctx.path}`);
    } else {
      webLogger.info(responseData, `${ctx.method} ${ctx.path}`);
    }
  } catch (err) {
    // Log errors
    const duration = Date.now() - start;
    webLogger.error({
      ...logData,
      duration,
      error: err instanceof Error ? err.message : String(err),
    }, `${ctx.method} ${ctx.path} - Error`);
    throw err;
  }
};

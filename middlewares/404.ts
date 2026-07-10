import type { Middleware } from 'koa';

export const handle404: Middleware = async (ctx, next) => {
  try {
    await next();
    const status = ctx.status || 404;
    if (status === 404) {
      ctx.throw(404, 'Not Found');
    }
  } catch (err) {
    // Koa-thrown HttpErrors carry a status; anything else falls back to 500
    const httpError = err as { status?: number; statusCode?: number };
    ctx.status = httpError.status || httpError.statusCode || 500;
    if (ctx.status == 404) {
      ctx.render('404.html');
    }
    else {
      throw err;
    }
  }
};

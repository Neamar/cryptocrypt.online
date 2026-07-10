export const handle404 = async (ctx, next) => {
  try {
    await next();
    const status = ctx.status || 404;
    if (status === 404) {
      ctx.throw(404, 'Not Found');
    }
  } catch (err) {
    ctx.status = err.status || err.statusCode || 500;
    if (ctx.status == 404) {
      await ctx.render('404.html');
    }
    else {
      throw err;
    }
  }
};

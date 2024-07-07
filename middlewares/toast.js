export const setToast = (toast, ctx) => {
  ctx.cookies.set('toast', toast);
};

/**
 * Used as Koa middleware to set the toast directly on the ctx for easy access
 */
export const readToast = async (ctx, next) => {
  const toast = ctx.cookies.get('toast');
  ctx.toast = toast;

  await next();

  if (ctx.status < 300) {
    ctx.cookies.set('toast');
  }
};

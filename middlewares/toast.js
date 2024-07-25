export const setToast = (toast, ctx) => {
  ctx.cookies.set('toast', toast);
};

/**
 * Used as Koa middleware to set the toast directly on the ctx for easy access
 */
export const readToast = async (ctx, next) => {
  const toast = ctx.cookies.get('toast');
  ctx.toast = toast;
  ctx.toastLevel = ctx.cookies.get('toast-lvl') || 'info';
  ctx.setToast = (toast, level = 'info') => {
    ctx.cookies.set('toast', toast);
    ctx.cookies.set('toast-lvl', level);

    ctx.toast = toast;
    ctx.toastLevel = level;
  };

  await next();

  // Erase toast if page was sent
  if (toast && ctx.status < 300) {
    ctx.cookies.set('toast');
    ctx.cookies.set('toast-lvl');
  }
};

import { isProd } from '../helpers/env.js';

/**
 * Used as Koa middleware to set the toast directly on the ctx for easy access
 */
export const readToast = async (ctx, next) => {
  const toast = ctx.cookies.get('toast');
  ctx.toast = toast;
  ctx.toastLevel = ctx.cookies.get('toast-lvl') || 'info';

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    ...(isProd && { secure: true }),
  };

  ctx.setToast = (toast, level = 'info') => {
    ctx.cookies.set('toast', toast, cookieOptions);
    ctx.cookies.set('toast-lvl', level, cookieOptions);

    ctx.toast = toast;
    ctx.toastLevel = level;
  };

  await next();

  // Erase toast if page was sent
  if (toast && ctx.status < 300) {
    ctx.cookies.set('toast', null, cookieOptions);
    ctx.cookies.set('toast-lvl', null, cookieOptions);
  }
};

import nunjucks from "nunjucks";

const isProd = process.env.NODE_ENV === 'production';

nunjucks.configure('views', { autoescape: true, noCache: !isProd, throwOnUndefined: !isProd, });


export const addTemplate = async (ctx, next) => {
  ctx.render = (view, opts = {}) => {
    ctx.body = nunjucks.render(view, { ...opts, ctx });
  };

  return next();
};

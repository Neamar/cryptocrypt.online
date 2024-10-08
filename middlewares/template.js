import nunjucks from "nunjucks";
import { STATUS_EMPTY, STATUS_INVALID, STATUS_READY, STATUS_SENT } from '../models/crypt.js';
import { isProd } from '../helpers/env.js';


const nunjucksWebenv = nunjucks.configure('views', { autoescape: true, noCache: !isProd, throwOnUndefined: !isProd, });

export const addTemplate = async (ctx, next) => {
  ctx.render = (view, opts = {}) => {
    ctx.body = nunjucksWebenv.render(view, {
      ...opts,
      ctx,
      crypt: ctx.crypt,
      STATUS_EMPTY,
      STATUS_INVALID,
      STATUS_READY,
      STATUS_SENT,
    });
  };

  return next();
};

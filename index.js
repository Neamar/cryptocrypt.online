import Koa from 'koa';
import koaStatic from 'koa-static';
import koaFormidable from 'koa2-formidable';
import koaBunyanLogger from 'koa-bunyan-logger';

import defaultRoutes from './routes/default.js';
import cryptRoutes from './routes/crypt.js';
import { readToast } from './middlewares/toast.js';
import { addTemplate } from './middlewares/template.js';
import { bodyParser } from '@koa/bodyparser';
import { addCSP } from './middlewares/csp.js';
import { webLogger } from './jobs/helpers/logger.js';
import { rateLimitCrypts } from './middlewares/rate-limit.js';

export const app = new Koa();

app
  // gives access to ctx.log.info
  .use(koaBunyanLogger(webLogger))
  // automatically log requests
  .use(koaBunyanLogger.requestLogger({
    updateLogFields: (requestData) => {
      requestData.req = undefined;
      // @ts-ignore
      requestData.res = undefined;
      return requestData;
    }
  }))
  // rate limit access to /crypts/* endpoint
  .use(rateLimitCrypts)
  // Add Content Security Policy headers
  .use(addCSP)
  // parse file data in <form>
  .use(koaFormidable())
  // parse body data
  .use(bodyParser())
  // allow using ctx.render()
  .use(addTemplate)
  // allow setting a message toast for the next request
  .use(readToast)
  // top-level routes (/, /faq, ...)
  .use(defaultRoutes.routes())
  .use(defaultRoutes.allowedMethods())
  // /crypts/* routes
  .use(cryptRoutes.routes())
  .use(cryptRoutes.allowedMethods())
  // serve static files (favicon, manifest, ...)
  .use(koaStatic('static'));

export const server = app.listen(process.env.PORT || 3000);

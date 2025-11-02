import Koa from 'koa';
import koaStatic from 'koa-static';
import { bodyParser } from '@koa/bodyparser';

import defaultRoutes from './routes/default.js';
import cryptRoutes from './routes/crypt.js';
import { readToast } from './middlewares/toast.js';
import { addTemplate } from './middlewares/template.js';
import { addCSP } from './middlewares/csp.js';
import { attachLogger } from './middlewares/logger.js';
import { formidableMiddleware } from './middlewares/formidable.js';
import { webLogger } from './helpers/logger.js';
import { rateLimitCrypts } from './middlewares/rate-limit.js';
import { addRequestLogs } from './middlewares/logs.js';
import { handle404 } from './middlewares/404.js';
import { isProd } from './helpers/env.js';

// proxy:true means we run behind a reverse proxy, and we should trust the X-Forwarded-For header.
// If you ever run Node directly (you shouldn't outside of local dev), make sure to remove this.
export const app = new Koa({ proxy: true });

app
  // gives access to ctx.log.info
  .use(attachLogger(webLogger))
  // automatically log requests
  .use(addRequestLogs)
  // rate limit access to /crypts/* endpoint
  .use(rateLimitCrypts)
  // Handle 404
  .use(handle404)
  // Add Content Security Policy headers
  .use(addCSP)
  // parse file data in <form>
  .use(formidableMiddleware)
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
  .use(koaStatic('static', { maxAge: isProd ? 1000 * 60 * 60 * 24 : 0 }));

const port = process.env.PORT || 3000;
export const server = app.listen(port, (err) => {
  if (err) {
    throw err;
  }
  webLogger.info(`Server listening`, { port });
});

import Koa from 'koa';
import koaStatic from 'koa-static';
import { bodyParser } from '@koa/bodyparser';

import defaultRoutes from './routes/default.ts';
import cryptRoutes from './routes/crypt.ts';
import { readToast } from './middlewares/toast.ts';
import { addTemplate } from './middlewares/template.ts';
import { addCSP } from './middlewares/csp.ts';
import { attachLogger } from './middlewares/logger.ts';
import { formidableMiddleware } from './middlewares/formidable.ts';
import { webLogger } from './helpers/logger.ts';
import { rateLimitCrypts } from './middlewares/rate-limit.ts';
import { addRequestLogs } from './middlewares/logs.ts';
import { handle404 } from './middlewares/404.ts';
import { isProd } from './helpers/env.ts';

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

// Careful: PORT=0 (ephemeral port, used by the test suite) must be preserved, so no `Number(...) || 3000`.
const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;
// net.Server's listen callback takes no error argument (an error would be thrown or emitted instead).
export const server = app.listen(port, () => {
  webLogger.info({ port }, `Server listening`);
});

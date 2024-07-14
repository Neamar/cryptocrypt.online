import Koa from 'koa';
import koaStatic from 'koa-static';
import koaRatelimit from 'koa-ratelimit';
import koaFormidable from 'koa2-formidable';
import koaBunyanLogger from 'koa-bunyan-logger';

import defaultRoutes from './routes/default.js';
import cryptRoutes from './routes/crypt.js';
import { readToast } from './middlewares/toast.js';
import { addTemplate } from './middlewares/template.js';
import { bodyParser } from '@koa/bodyparser';

const app = new Koa();


app
  // gives access to ctx.log.info
  .use(koaBunyanLogger())
  // automatically log requests
  .use(koaBunyanLogger.requestLogger())
  // rate limit access to /crypts/* endpoint
  .use(koaRatelimit({
    driver: 'memory',
    db: new Map(),
    duration: 10000,
    errorMessage: 'Wow, easy with the refresh champ!',
    id: (ctx) => ctx.ip,
    max: 10,
    disableHeader: true,
    whitelist: (ctx) => {
      // Only rate limit the crypts
      return !ctx.request.path.startsWith('/crypts');
    },
  }))
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

app.listen(process.env.PORT || 3000);

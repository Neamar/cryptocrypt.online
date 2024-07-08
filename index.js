import Koa from 'koa';
import koaLogger from 'koa-logger';
import koaStatic from 'koa-static';
import koaRatelimit from 'koa-ratelimit';

import defaultRoutes from './routes/default.js';
import cryptRoutes from './routes/crypt.js';
import { readToast } from './middlewares/toast.js';
import { addTemplate } from './middlewares/template.js';
import { bodyParser } from '@koa/bodyparser';

const app = new Koa();


app
  .use(koaLogger())
  .use(koaRatelimit({
    driver: 'memory',
    db: new Map(),
    duration: 10000,
    errorMessage: 'Wow, easy with the refresh champ!',
    id: (ctx) => ctx.ip,
    max: 10,
    disableHeader: true,
    whitelist: (ctx) => {
      console.log(ctx.request.path);
      // Only rate limit the crypts
      return !ctx.request.path.startsWith('/crypts');
    },
  }))
  .use(bodyParser())
  .use(addTemplate)
  .use(readToast)
  .use(defaultRoutes.routes())
  .use(defaultRoutes.allowedMethods())
  .use(cryptRoutes.routes())
  .use(cryptRoutes.allowedMethods())
  .use(koaStatic('static'));

app.listen(process.env.PORT || 3000);

import Koa from 'koa';
import koaLogger from 'koa-logger';

import defaultRoutes from './routes/default.js';
import cryptRoutes from './routes/crypt.js';
import { readToast } from './middlewares/toast.js';
import { addTemplate } from './middlewares/template.js';
import { bodyParser } from '@koa/bodyparser';

const app = new Koa();


app
  .use(koaLogger())
  .use(bodyParser())
  .use(addTemplate)
  .use(readToast)
  .use(defaultRoutes.routes())
  .use(defaultRoutes.allowedMethods())
  .use(cryptRoutes.routes())
  .use(cryptRoutes.allowedMethods());

app.listen(process.env.PORT || 3000);

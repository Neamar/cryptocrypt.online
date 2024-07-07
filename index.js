import Koa from 'koa';
import Router from '@koa/router';
import nunjucks from "nunjucks";
import db from './db.js';

const app = new Koa();
const router = new Router();
nunjucks.configure('views', { autoescape: true });

router.get('/', (ctx) => {
  ctx.body = nunjucks.render('index.html', { foo: 'bar' });
});

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000);

(async () => {
  console.log(await db.raw('SELECT 1*6'));

})();

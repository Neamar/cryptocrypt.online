import Router from '@koa/router';

const router = new Router();

router.get('/', (ctx) => {
  ctx.render('index.html');
});

export default router;

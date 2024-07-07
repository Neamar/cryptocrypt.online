import Router from '@koa/router';
import db from '../db.js';
import { logCryptEvent } from '../models/crypts.js';
import { getCrypt } from '../middlewares/crypt.js';

const router = new Router();

router.post('/create', async (ctx) => {
  let cryptUuid;
  await db.transaction(async (trx) => {
    cryptUuid = (await db('crypts').insert({
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('uuid'))[0].uuid;
    await logCryptEvent(cryptUuid, 'Crypt created', ctx, trx);
  });

  ctx.cookies.set('toast', 'A new crypt was created.');
  ctx.redirect(`/crypts/${cryptUuid}/warnings`);
});

router.get('/crypts/:uuid/warnings', getCrypt, (ctx) => {
  ctx.render('crypts/uuid/warnings.html');
});

export default router;

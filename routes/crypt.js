import Router from '@koa/router';
import emailValidator from 'email-validator';

import db from '../db.js';
import { logCryptEvent, STATUS_EMPTY, STATUS_INVALID, STATUS_READY, STATUS_SENT, } from '../models/crypts.js';
import { getCrypt, requireUnsentCrypt } from '../middlewares/crypt.js';
const router = new Router();

/**
 * Create a new crypt, redirects to the new object
 */
router.post('/create', async (ctx) => {
  let cryptUuid;
  await db.transaction(async (trx) => {
    cryptUuid = (await db('crypts').insert({
      created_at: new Date(),
      updated_at: new Date(),
      refreshed_at: new Date(),
      status: STATUS_EMPTY
    }).returning('uuid'))[0].uuid;
    await logCryptEvent(cryptUuid, 'Crypt created', ctx, trx);
  });

  ctx.cookies.set('toast', 'A new crypt was created.');
  ctx.redirect(`/crypts/${cryptUuid}/warnings`);
});

/**
 * Display warnings about crypt usage
 */
router.get('/crypts/:uuid/warnings', getCrypt, (ctx) => {
  ctx.render('crypts/uuid/warnings.html', { title: "Read me first" });
});


/**
 * Show form to edit the crypt
 */
router.get('/crypts/:uuid/edit', getCrypt, requireUnsentCrypt, (ctx) => {
  ctx.render('crypts/uuid/edit.html', { title: "Edit your crypt" });
});

/**
 * Save crypt changes
 */
router.post('/crypts/:uuid/edit', getCrypt, requireUnsentCrypt, async (ctx) => {
  const fields = ['from_name', 'from_mail', 'to_name', 'to_mail', 'message'];

  const escapeHtml = (unsafe) => {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  };

  const payload = Object.fromEntries(fields.map(f => [f, escapeHtml(ctx.request.body[f] || '').trim()]));

  const validEmails = ['from_mail', 'to_mail'].every(field => emailValidator.validate(payload[field]));
  const validMessage = !!payload['message'];
  const validNames = !!payload['from_name'] && !!payload['to_name'];

  payload['status'] = validEmails && validMessage && validNames ? STATUS_READY : STATUS_INVALID;

  await db.transaction(async (trx) => {
    await db('crypts').update({
      ...payload,
      updated_at: new Date(),
    }).where('uuid', ctx.crypt.uuid);
    await logCryptEvent(ctx.crypt.uuid, 'Crypt updated', ctx, trx);
  });

  if (payload['status'] === STATUS_READY) {
    ctx.setToast("Your crypt was saved.");
    ctx.redirect(`/crypts/${ctx.crypt.uuid}`);
  }
  else {
    const invalid = [];
    !validEmails && invalid.push("invalid email");
    !validMessage && invalid.push("missing message");
    !validNames && invalid.push("missing names");

    ctx.setToast(`Your crypt was saved, but some information is still missing: ${invalid.join(', ')}`);
    ctx.redirect(`/crypts/${ctx.crypt.uuid}/edit`);
  }
});

/**
 * Crypt main page
 */
router.get('/crypts/:uuid', getCrypt, async (ctx) => {
  const ACTIONS = {};
  ACTIONS[STATUS_EMPTY] = ['edit', 'delete'];
  ACTIONS[STATUS_INVALID] = ['edit', 'delete'];
  ACTIONS[STATUS_READY] = ['preview', 'edit', 'delete'];
  ACTIONS[STATUS_SENT] = ['delete'];

  const events = await db('crypt_events').where('crypt_uuid', ctx.crypt.uuid).orderBy('created_at', 'desc').limit(30).select('event', 'created_at');

  ctx.render('crypts/uuid/index.html', {
    title: 'Your crypt',
    events,
    actions: ACTIONS[ctx.crypt.status],
  });
});

/**
 * Show form to delete the crypt
 */
router.get('/crypts/:uuid/delete', getCrypt, (ctx) => {
  ctx.render('crypts/uuid/delete.html', {
    title: 'Delete crypt?',
  });
});

/**
 * Crypt delete page
 */
router.post('/crypts/:uuid/delete', getCrypt, async (ctx) => {
  await db('crypts').delete('uuid', ctx.crypt.uuid);

  ctx.render('crypts/uuid/deleted.html', {
    title: 'Crypt deleted',
  });
});


/**
 * Show form to delete the crypt
 */
router.get('/crypts/:uuid/read', getCrypt, (ctx) => {
  ctx.render('crypts/uuid/read.html', {
    title: `A message from ${ctx.crypt.from_name} to ${ctx.crypt.to_name}`,
  });
});

export default router;

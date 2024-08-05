import Router from '@koa/router';
import emailValidator from 'email-validator';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import db from '../db.js';
import { logCryptEvent, STATUS_EMPTY, STATUS_INVALID, STATUS_READ, STATUS_READY, STATUS_SENT, } from '../models/crypts.js';
import { getCrypt, requireCryptStatus } from '../middlewares/crypt.js';
import { NotFound } from 'fejl';
const router = new Router();


/**
 * Create a new crypt, redirects to the new object
 */
router.post('/crypts/create', async (ctx) => {
  // The UUID is generated using a cryptographic pseudorandom number generator.
  // This avoids a pitfall in Postgres where gen_random_uuid could silently fall back to a non-cryptographic RNG.
  // https://security.stackexchange.com/questions/93902/is-postgress-uuid-generate-v4-securely-random
  const cryptUuid = randomUUID();
  const now = new Date();
  await db.transaction(async (trx) => {
    await db('crypts').insert({
      uuid: cryptUuid,
      created_at: now,
      updated_at: now,
      refreshed_at: now,
      status: STATUS_EMPTY
    });
    await logCryptEvent(cryptUuid, 'Crypt created', ctx, trx);
  });

  ctx.setToast('A new crypt was created.');
  ctx.redirect(`/crypts/${cryptUuid}/warnings`);
});


/**
 * Display warnings about crypt usage
 */
router.get('/crypts/:uuid/warnings', getCrypt, requireCryptStatus([STATUS_EMPTY, STATUS_INVALID, STATUS_READY]), (ctx) => {
  ctx.render('crypts/uuid/warnings.html', { title: "Read me first" });
});


/**
 * Show form to edit the crypt
 */
router.get('/crypts/:uuid/edit', getCrypt, requireCryptStatus([STATUS_EMPTY, STATUS_INVALID, STATUS_READY]), (ctx) => {
  ctx.render('crypts/uuid/edit.html', { title: "Edit your crypt" });
});


/**
 * Save crypt changes
 */
router.post('/crypts/:uuid/edit', getCrypt, requireCryptStatus([STATUS_EMPTY, STATUS_INVALID, STATUS_READY]), async (ctx) => {
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

  if (ctx?.request?.files?.encrypted_message && ctx.request.files.encrypted_message.size > 0) {
    if (ctx.request.files.encrypted_message.size >= 100000) {
      ctx.setToast(`The file you included is too large, you should include encrypted text, not images!`, 'error');
      ctx.redirect(`/crypts/${ctx.crypt.uuid}/edit`);
      return;
    }

    const fileName = escapeHtml(ctx.request.files.encrypted_message.name);
    const content = readFileSync(ctx.request.files.encrypted_message.path);

    await db.transaction(async (trx) => {
      await db('crypts').update({
        encrypted_message_name: fileName,
        encrypted_message: content,
        updated_at: new Date(),
      }).where('uuid', ctx.crypt.uuid);
      await logCryptEvent(ctx.crypt.uuid, 'Crypt updated with new encoded file', ctx, trx);
    });
  }

  if (payload['status'] === STATUS_READY) {
    ctx.setToast("Your crypt was saved.");
    ctx.redirect(`/crypts/${ctx.crypt.uuid}`);
  }
  else {
    const invalid = [];
    !validEmails && invalid.push("invalid email");
    !validMessage && invalid.push("missing message");
    !validNames && invalid.push("missing names");

    ctx.setToast(`Your crypt was saved, but some information is still missing: ${invalid.join(', ')}`, 'warn');
    ctx.redirect(`/crypts/${ctx.crypt.uuid}/edit`);
  }
});


/**
 * Crypt main page
 */
router.get('/crypts/:uuid', getCrypt, requireCryptStatus([STATUS_EMPTY, STATUS_INVALID, STATUS_READY]), async (ctx) => {
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
 * Show crypt content (and a preview warning if status <> sent)
 */
router.get('/crypts/:uuid/read', getCrypt, requireCryptStatus([STATUS_READY, STATUS_SENT, STATUS_READ]), async (ctx) => {
  if (ctx.crypt.status == STATUS_SENT || ctx.crypt.status == STATUS_READ) {
    await logCryptEvent("Crypt read by recipient");
    if (ctx.crypt.status === STATUS_SENT) {
      await db('crypts').where('uuid', ctx.crypt.uuid).update('status', STATUS_READ).update('read_at', new Date());
    }
  }

  ctx.render('crypts/uuid/read.html', {
    title: `A message from ${ctx.crypt.from_name} to ${ctx.crypt.to_name}`,
  });
});


/**
 * Crypt encrypted message
 */
router.get('/crypts/:uuid/file', async (ctx) => {
  const crypt = await db('crypts').where('uuid', ctx.params.uuid).whereNotNull('encrypted_message').select('encrypted_message', 'encrypted_message_name').first();
  NotFound.assert(crypt, 'No file associated with this crypt.');

  ctx.set('content-disposition', `attachment; filename="${crypt.encrypted_message_name}"`);
  ctx.body = crypt.encrypted_message;
});
export default router;


/**
 * Confirm the user is doing a-OK still
 */
router.get('/crypts/:uuid/healthcheck', getCrypt, requireCryptStatus([STATUS_READY]), async (ctx) => {
  const crypt = ctx.crypt;
  const now = new Date();
  var firstDayOfTheMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (crypt.refreshed_at < firstDayOfTheMonth) {
    crypt.refreshed_at = new Date();
    // Refresh last crypt usage, user is still alive!
    await db('crypts').where('uuid', crypt.uuid).update({
      refreshed_at: crypt.refreshed_at,
      times_contacted: 0
    });

    ctx.setToast("Thanks for confirming! See you next month.", 'info');
  }

  ctx.render('crypts/uuid/healthcheck.html', {
    title: `Crypt healthcheck`,
  });
});

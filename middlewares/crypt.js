import db from '../db.js';
import { NotFound } from 'fejl';
import { isProd } from '../helpers/env.js';
import { sendEmail, templateEmail } from '../helpers/mail.js';
import { AUTH_MAIL_COOLDOWN_MS, cryptLink, getAuthCookie, getCryptHash, isValidAuthCookie, logCryptEvent, STATUS_EMPTY, STATUS_READY } from '../models/crypt.js';

// Statuses where owner authentication is enforced. Other statuses either have no
// verified email yet (invalid) or are already published to the recipient (sent/read).
const AUTHENTICATED_STATUSES = [STATUS_EMPTY, STATUS_READY];

export const getCrypt = async (ctx, next) => {
  // Retrieve the crypt, except encrypted message.
  const crypt = await db('crypts').where('uuid', ctx.params.uuid).select('uuid', 'from_name', 'from_mail', 'to_name', 'to_mail', 'message', 'encrypted_message_name', 'status', 'created_at', 'updated_at', 'refreshed_at', 'triggered_at', 'read_at', 'auth_mail_sent_at', db.raw('pg_size_pretty(LENGTH(encrypted_message)::bigint) as encrypted_message_length')).first();

  NotFound.assert(crypt, 'This crypt does not exist');

  ctx.crypt = crypt;

  return next();
};

/**
 *
 * @param {("empty"|"invalid"|"ready"|"sent"|"read")[]} statuses
 * @returns Function
 */
export const requireCryptStatus = (statuses) => {
  return async (ctx, next) => {
    if (!statuses.includes(ctx.crypt.status)) {
      ctx.setToast('This action is not available for this crypt, redirecting to crypt main page.');
      ctx.redirect(cryptLink(ctx.crypt, ''));
    }
    else {
      return next();
    }
  };
};

/**
 * Set the week-long authentication cookie for the current crypt owner.
 * The cookie is scoped to this crypt's path so it never leaks to other crypts.
 */
export const setCryptAuthCookie = (ctx) => {
  const { name, value, validUntil } = getAuthCookie(ctx.crypt);
  ctx.cookies.set(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    // No trailing slash: browsers won't send a "/crypts/<uuid>/"-scoped cookie to
    // "/crypts/<uuid>" (RFC 6265 path-match), and both forms serve the dashboard.
    path: `/crypts/${ctx.crypt.uuid}`,
    expires: new Date(validUntil),
    ...(isProd && { secure: true }),
  });
};

const hasValidAuthCookie = (ctx) => {
  const cookieValue = ctx.cookies.get(`auth-${ctx.crypt.uuid}`);
  return isValidAuthCookie(ctx.crypt, cookieValue);
};

/**
 * Gate an action behind owner authentication.
 * Invalid + published crypts pass through untouched; empty/ready require a valid cookie.
 */
export const requireCryptAuth = async (ctx, next) => {
  if (!AUTHENTICATED_STATUSES.includes(ctx.crypt.status) || hasValidAuthCookie(ctx)) {
    return next();
  }

  ctx.setToast('Please verify your identity to access this crypt.', 'warn');
  ctx.redirect(cryptLink(ctx.crypt, ''));
};

/**
 * Mask an email address for display to an unauthenticated visitor.
 * e.g. "foobar@baz.com" => "f***@baz.com"
 */
const maskEmail = (email) => {
  const [local, domain] = (email || '').split('@');
  if (!local || !domain) {
    return '***';
  }
  return `${local[0]}***@${domain}`;
};

/**
 * Dashboard-only middleware: if the visitor is not authenticated for an
 * empty/ready crypt, send a magic link (subject to cooldown) and render the
 * "locked" page with a 401 status.
 */
export const challengeCryptAuth = async (ctx, next) => {
  if (!AUTHENTICATED_STATUSES.includes(ctx.crypt.status) || hasValidAuthCookie(ctx)) {
    return next();
  }

  const now = Date.now();
  const lastSent = ctx.crypt.auth_mail_sent_at ? new Date(ctx.crypt.auth_mail_sent_at).getTime() : 0;
  const canSend = now - lastSent > AUTH_MAIL_COOLDOWN_MS;

  let mailJustSent = false;
  if (canSend) {
    const hash = getCryptHash(ctx.crypt, 'auth-email', ctx.crypt.from_mail, now + 1000 * 60 * 60 * 24);
    const link = `${process.env.SELF_URL}${cryptLink(ctx.crypt, 'auth-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`;
    const template = templateEmail('auth-email.html', { link });
    const hostname = new URL(process.env.SELF_URL).hostname;

    mailJustSent = await sendEmail({
      from: `Cryptocrypt <contact@${hostname}>`,
      to: ctx.crypt.from_mail,
      subject: template.subject,
      html: template.html
    });

    // Only start the cooldown if the mail actually went out, so a transient
    // SMTP failure doesn't lock the owner out for 15 minutes with no email.
    if (mailJustSent) {
      await db.transaction(async (trx) => {
        await db('crypts').update({ auth_mail_sent_at: new Date() }).where('uuid', ctx.crypt.uuid).transacting(trx);
        await logCryptEvent(ctx.crypt.uuid, 'Authentication email sent', ctx, trx);
      });
    }
  }

  ctx.render('crypts/uuid/authenticate.html', {
    title: 'Verify your identity',
    maskedEmail: maskEmail(ctx.crypt.from_mail),
    mailJustSent,
    mailFailed: canSend && !mailJustSent,
  });
  // Assign status *after* render, since setting ctx.body resets ctx.status to 200.
  ctx.status = 401;
};

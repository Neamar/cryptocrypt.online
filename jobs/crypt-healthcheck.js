import pMap from 'p-map';
import db from '../db.js';
import jobLogger from './helpers/logger.js';
import { sendEmail } from '../helpers/mail.js';
import { STATUS_READY } from '../models/crypts.js';

const logger = jobLogger.child({ job: 'healthcheck' });

const contactTemplates = [
  {
    subject: () => "Please confirm you're well",
    html: (crypt, link) => `<p>Dear ${crypt.from_name},<br>You have a crypt including information you'd like to share in the event of your death.</p>
    <p>If you're still around, great! Please <a href="${link}">click on this link and carry on</a>.</p>

    <p>If you ignore this message, the next reminder will be sent in 15 days.<br>After 35 inactive days, your message will be sent to ${crypt.to_name}.</p>`
  },
  {
    subject: () => "Please confirm you're well (second reminder)",
    html: (crypt, link) => `<p>Dear ${crypt.from_name},<br>You have a crypt including information you'd like to share in the event of your death.</p>
    <p>If you're still around, great! Please <a href="${link}">click on this link and carry on</a>.</p>

    <p>If you ignore this message, the next reminder will be sent in 7 days.<br>If we don't hear from you by the 5th of next month, your message will be sent to ${crypt.to_name}.</p>`
  },
  {
    subject: (crypt) => `${crypt.from_name}, are you OK? (third reminder)`,
    html: (crypt, link) => `<p>Dear ${crypt.from_name},<br>This is your third reminder, we're getting a little concerned.<br>
    You have a crypt including information you'd like to share in the event of your death.</p>
    <p>If you're still around, great! Please <a href="${link}">click on this link and carry on</a>.</p>

    <p>If you ignore this message, the next reminder will be sent in 3 days.<br>If we don't hear from you by the 5th of next month, your message will be sent to ${crypt.to_name}.</p>`
  },
  {
    subject: (crypt) => `[ACTION REQUIRED] ${crypt.from_name}, are you OK? (fourth reminder)`,
    html: (crypt, link) => `<p>Dear ${crypt.from_name},<br>This is your fourth reminder this month, we're getting increasingly concerned.<br>
    You have a crypt including information you'd like to share in the event of your death or disappearance.</p>
    <p>If you're still around, great! Please <a href="${link}">click on this link and carry on</a>.</p>

    <p>If you ignore this message, a final reminder will be sent in 3 days.<br>If we don't hear from you by the 5th of next month, your message will be sent to ${crypt.to_name} as per your instructions.</p>`
  },
  {
    subject: (crypt) => `[ACTION REQUIRED] ${crypt.from_name}, are you OK? (fourth reminder)`,
    html: (crypt, link) => `<p>Dear ${crypt.from_name},<br>This is your fourth reminder this month, we're getting increasingly concerned.<br>
    You have a crypt including information you'd like to share in the event of your death or disappearance.</p>
    <p>If you're still around, great! Please <a href="${link}">click on this link and carry on</a>.</p>

    <p>If you ignore this message, a final reminder will be sent in 3 days.<br>If we don't hear from you by the 5th of next month, your message will be sent to ${crypt.to_name}.</p>`
  },
  {
    subject: (crypt) => `[ACTION REQUIRED] ${crypt.from_name}, final reminder before sending your info`,
    html: (crypt, link) => `<p>Dear ${crypt.from_name},<br><b>This is your last reminder</b>.<br>
    You have a crypt including information you'd like to share in the event of your death or disappearance, and we haven't heard from you in over a month.</p>
    <p>If you're still around, great! Don't delay, <a href="${link}">click this link and carry on</a>.</p>

    <p>Do not ignore this message.<br>If the link isn't clicked by the 5th of next month, your message will be sent to ${crypt.to_name}.</p>`
  },
];

export default async function main() {
  logger.info("Finding crypts that haven't been active this month");
  const cryptsToNotify = await db('crypts')
    .select('uuid', 'from_name', 'from_mail', 'to_name', 'times_contacted')
    .where('refreshed_at', '<', db.raw("DATE_TRUNC('month', current_date)"))
    .where('status', STATUS_READY);

  logger.info("Healthchecking crypts", { crypts: cryptsToNotify.map(c => c.uuid) });

  await pMap(cryptsToNotify, async (crypt) => {
    const template = contactTemplates[Math.min(crypt.times_contacted, contactTemplates.length - 1)];
    const link = `${process.env.SELF_URL}/crypts/${crypt.uuid}/healthcheck`;
    const footerInfo = `<hr /><p><small>If you want to review your crypt content, <a href="${process.env.SELF_URL}/crypts/${crypt.uuid}/">visit here</a>.</small></p>`;

    const email = {
      from: {
        name: 'Cryptocrypt healthcheck',
        email: 'healthcheck@cryptocrypt.online',
      },
      to: {
        name: crypt.from_name,
        email: crypt.from_mail,
      },
      subject: template.subject(crypt),
      html: template.html(crypt, link) + footerInfo,
    };

    await sendEmail(email);

    await db('crypts').where('uuid', crypt.uuid).update('times_contacted', crypt.times_contacted + 1);

  }, { concurrency: 3 });
}

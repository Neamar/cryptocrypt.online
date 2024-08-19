import pMap from 'p-map';
import db from '../db.js';
import jobLogger from './helpers/logger.js';
import { sendEmail } from '../helpers/mail.js';
import { cryptLink, STATUS_READY, STATUS_SENT } from '../models/crypt.js';

const logger = jobLogger.child({ job: 'healthcheck' });


export default async function main() {
  logger.info("Finding crypts that haven't been refreshed and need to be released");
  const cryptsToNotify = await db('crypts')
    .select('uuid', 'from_name', 'from_mail', 'to_name', 'times_contacted')
    .where('refreshed_at', '<', db.raw("DATE_TRUNC('month', current_date)"))
    .where('times_contacted', '>=', 6)
    .where('status', STATUS_READY);

  logger.info("Releasing crypts", { crypts: cryptsToNotify.map(c => c.uuid) });

  await pMap(cryptsToNotify, async (crypt) => {
    const link = `${process.env.SELF_URL}${cryptLink(crypt, 'healthcheck')}`;

    const email = {
      from: {
        name: `${crypt.from_name} delayed message`,
        email: 'contact@cryptocrypt.online',
      },
      to: {
        name: crypt.to_name,
        email: crypt.to_mail,
      },
      subject: `${crypt.from_name} left a message for you in case something happened`,
      html: `
<p>Dear ${crypt.to_name}<br>${crypt.from_name} wrote a message some time ago. They scheduled it to be sent automatically in the event they stopped online activity.<br />We tried to reach them multiple times over the last month, and were unable to get any update from them, so we're now assuming the worst and releasing the content he trusted us with.</p>
<p>You are now <a href="${link}">able to read ${crypt.from_name} delayed message</a>.</p>
<p>If this message was sent in error and you know for certain ${crypt.from_name} is still alive, do not click the link above, and instead forward this message to them so they can act accordingly.</p>
<p>If you do not know ${crypt.from_name}, that's weird, since they explicitly asked us to contact you. If that's the case, please reply to this message to let us know you're not the intended recipient, thanks.</p>`,
    };

    await sendEmail(email);

    await db('crypts').where('uuid', crypt.uuid).update('status', STATUS_SENT);

  }, { concurrency: 3 });
}

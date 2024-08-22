import pMap from 'p-map';
import db from '../db.js';
import jobLogger from './helpers/logger.js';
import { sendEmail, templateEmail } from '../helpers/mail.js';
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
    const template = templateEmail(`release.html`, { crypt, link });

    const email = {
      from: {
        name: `${crypt.from_name} delayed message`,
        email: `contact@${process.env.SELF_URL}`,
      },
      to: {
        name: crypt.to_name,
        email: crypt.to_mail,
      },
      subject: template.subject,
      html: template.html
    };

    await sendEmail(email);

    await db('crypts').where('uuid', crypt.uuid).update('status', STATUS_SENT);

  }, { concurrency: 3 });
}

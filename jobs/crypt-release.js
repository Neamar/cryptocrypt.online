import pMap from 'p-map';
import db from '../db.js';
import { jobLogger } from '../helpers/logger.js';
import { sendEmail, templateEmail } from '../helpers/mail.js';
import { cryptLink, STATUS_READY, STATUS_SENT } from '../models/crypt.js';

const logger = jobLogger.child({ job: 'healthcheck' });
const pingUrl = process.env.RELEASE_PING_URL;
const hostname = new URL(process.env.SELF_URL).hostname;


export default async function main() {
  logger.info("Finding crypts that haven't been refreshed and need to be released");
  // (optional) Notify healthchecks.io that a run started
  if (pingUrl) {
    await fetch(`${pingUrl}/start`);
  }

  const cryptsToNotify = await db('crypts')
    .select('uuid', 'from_name', 'from_mail', 'to_name', 'to_mail', 'times_contacted')
    .where('refreshed_at', '<', db.raw("DATE_TRUNC('month', current_date)"))
    .where('times_contacted', '>=', 6)
    .where('status', STATUS_READY);

  logger.info("Releasing crypts", { crypts: cryptsToNotify.map(c => c.uuid) });

  await pMap(cryptsToNotify, async (crypt) => {
    const link = `${process.env.SELF_URL}${cryptLink(crypt, 'read')}`;
    const template = templateEmail(`release.html`, { crypt, link });

    const email = {
      from: {
        name: `${crypt.from_name} delayed message`,
        email: `contact@${hostname}`,
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

  // (optional) Notify healtchecks.io that a run finished
  if (pingUrl) {
    await fetch(`${pingUrl}`);
  }
}

import pMap from 'p-map';
import db from '../db.js';
import { jobLogger } from '../helpers/logger.js';
import { sendEmail, templateEmail } from '../helpers/mail.js';
import { cryptLink, STATUS_READY } from '../models/crypt.js';

const logger = jobLogger.child({ job: 'healthcheck' });

const pingUrl = process.env.HEALTHCHECK_PING_URL;

const hostname = new URL(process.env.SELF_URL).hostname;

export default async function main() {
  logger.info("Finding crypts that haven't been active this month");
  // (optional) Notify healthchecks.io that a run started
  if (pingUrl) {
    await fetch(`${pingUrl}/start`);
  }

  const cryptsToNotify = await db('crypts')
    .select('uuid', 'from_name', 'from_mail', 'to_name', 'times_contacted')
    .where('refreshed_at', '<', db.raw("DATE_TRUNC('month', current_date)"))
    .where('status', STATUS_READY);

  logger.info("Healthchecking crypts", { crypts: cryptsToNotify.map(c => c.uuid) });

  await pMap(cryptsToNotify, async (crypt) => {
    const link = `${process.env.SELF_URL}${cryptLink(crypt, 'healthcheck')}`;
    const mainLink = `${process.env.SELF_URL}${cryptLink(crypt, '')}`;

    const template = templateEmail(`healthcheck-${Math.min(crypt.times_contacted + 1, 6)}.html`, { crypt, link, mainLink });
    const email = {
      from: {
        name: 'Cryptocrypt healthcheck',
        email: `healthcheck@${hostname}`,
      },
      to: {
        name: crypt.from_name,
        email: crypt.from_mail,
      },
      subject: template.subject,
      html: template.html
    };

    await sendEmail(email);

    await db('crypts').where('uuid', crypt.uuid).update('times_contacted', crypt.times_contacted + 1);

  }, { concurrency: 3 });

  // (optional) Notify healthchecks.io that a run finished
  if (pingUrl) {
    await fetch(`${pingUrl}`);
  }
}

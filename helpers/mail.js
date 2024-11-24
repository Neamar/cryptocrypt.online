import sgMail from '@sendgrid/mail';
import { jobLogger } from './logger.js';
import { isProd, isTest } from './env.js';
import nunjucks from "nunjucks";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const nunjucksMailenv = nunjucks.configure('mails', { autoescape: true, noCache: !isProd, throwOnUndefined: !isProd, });

// Only for tests, access to lastMail sent
export let lastMail = null;

/**
 * Send an email if NODE_ENV=production, otherwise log it to the console.
 * @param {sgMail.MailDataRequired} msg
 */
export const sendEmail = async (msg) => {
  if (isTest) {
    lastMail = msg;
    return;
  }
  if (!isProd) {
    jobLogger.warn("Fake-sending email", msg);
    return;
  }

  try {
    await sgMail.send(msg);
  } catch (error) {
    jobLogger.error(error);
  }
};

export const templateEmail = (template, context) => {
  const content = nunjucksMailenv.render(template, context);
  const cutOff = content.indexOf('\n\n');

  return { subject: content.substring(0, cutOff), html: content.substring(cutOff + 2) };
};

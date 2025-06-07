import nodemailer from 'nodemailer';
import { jobLogger } from './logger.js';
import { isProd, isTest } from './env.js';
import nunjucks from "nunjucks";


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

if (isProd && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
  jobLogger.error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment variables.");
  throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment variables.");
}

const nunjucksMailenv = nunjucks.configure('mails', { autoescape: true, noCache: !isProd, throwOnUndefined: !isProd, });

// Only for tests, access to lastMail sent
export let lastMail = null;

/**
 * Send an email if NODE_ENV=production, otherwise log it to the console.
 * @param {Object} msg
 * @param {string} msg.to - The recipient email address.
 * @param {string} msg.from - The sender email address.
 * @param {string} msg.subject - The email subject.
 * @param {string} msg.html - The email body (HTML).
 */
export const sendEmail = async (msg) => {
  if (isTest) {
    lastMail = msg;
    return true;
  }
  if (!isProd) {
    jobLogger.warn("Fake-sending email", msg);
    return true;
  }


  try {
    await transporter.sendMail(msg);
  } catch (error) {
    jobLogger.error(error);
    return false;
  }
  return true;
};

export const templateEmail = (template, context) => {
  const content = nunjucksMailenv.render(template, context);
  const cutOff = content.indexOf('\n\n');

  return { subject: content.substring(0, cutOff), html: content.substring(cutOff + 2) };
};

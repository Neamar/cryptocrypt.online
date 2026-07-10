import nodemailer from 'nodemailer';
import { jobLogger } from './logger.ts';
import { isProd, isTest } from './env.ts';
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

export interface Mail {
  to: string;
  from: string;
  subject: string;
  html: string;
}

// Only for tests, access to lastMail sent
export let lastMail: Mail | null = null;

/**
 * Send an email if NODE_ENV=production, otherwise log it to the console.
 * @returns true if the email was sent (or fake-sent), false on SMTP failure.
 */
export const sendEmail = async (msg: Mail): Promise<boolean> => {
  if (isTest) {
    lastMail = msg;
    return true;
  }
  if (!isProd) {
    // pino takes the structured data first, then the message
    jobLogger.warn(msg, "Fake-sending email");
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

/**
 * Render a mail template (first line: subject, then a blank line, then the HTML body).
 */
export const templateEmail = (template: string, context: Record<string, unknown>): { subject: string; html: string } => {
  const content = nunjucksMailenv.render(template, context);
  const cutOff = content.indexOf('\n\n');

  return { subject: content.substring(0, cutOff), html: content.substring(cutOff + 2) };
};

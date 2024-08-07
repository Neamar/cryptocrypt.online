import sgMail from '@sendgrid/mail';
import logger from '../jobs/helpers/logger.js';
import { isProd, isTest } from './env.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email if NODE_ENV=production, otherwise log it to the console.
 * @param {sgMail.MailDataRequired} msg
 */
export const sendEmail = async (msg) => {
  if (!isProd || isTest) {
    logger.warn("Fake-sending email", msg);
    return;
  }
  try {
    await sgMail.send(msg);
  } catch (error) {
    logger.error(error);
  }
};
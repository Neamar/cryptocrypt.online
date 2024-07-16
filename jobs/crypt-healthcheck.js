import db from '../db.js';
import jobLogger from './helpers/logger.js';

const logger = jobLogger.child({ job: 'healthcheck' });

export default async function main() {
  logger.info("Finding crypts that haven't been active this month");
  const cryptsToNotify = await db('crypts').select().where('refreshed_at', '<', db.raw("DATE_TRUNC('month', current_date)"));
}

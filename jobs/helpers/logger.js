import bunyan from 'bunyan';
import { isTest } from '../../helpers/env.js';
const logger = bunyan.createLogger({ name: "jobs", level: isTest ? 100 : 0 });
export const webLogger = bunyan.createLogger({ name: "web", level: isTest ? 100 : 0 });

export default logger;

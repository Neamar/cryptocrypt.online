import bunyan from 'bunyan';
import bunyanFormat from 'bunyan-format';
import { isTest } from './env.js';

const formatOut = bunyanFormat({ outputMode: 'short' });
export const jobLogger = bunyan.createLogger({ name: "jobs", level: isTest ? 100 : 0, stream: formatOut });
export const webLogger = bunyan.createLogger({ name: "web", level: isTest ? 100 : 0, stream: formatOut });

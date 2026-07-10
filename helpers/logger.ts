import pino from 'pino';
import { isTest } from './env.ts';

const transport = pino.transport({
  target: 'pino-pretty',
  options: { colorize: true }
});

export const jobLogger = pino({ name: "jobs", level: isTest ? 'silent' : 'trace' }, transport);
export const webLogger = pino({ name: "web", level: isTest ? 'silent' : 'trace' }, transport);

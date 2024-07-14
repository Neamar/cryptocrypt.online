import bunyan from 'bunyan';
const logger = bunyan.createLogger({ name: "jobs" });
export default logger;

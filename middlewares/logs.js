import koaBunyanLogger from 'koa-bunyan-logger';
import { isProd } from '../helpers/env.js';

export const addRequestLogs = koaBunyanLogger.requestLogger({
  // Clean up default logs, which include hundreds of lines per request
  updateLogFields: function (requestData) {
    requestData.req = undefined;

    // Add IP address to all logs
    if (isProd) {
      // @ts-ignore
      requestData.ip = this.ip;
    }
    return requestData;
  },
  updateRequestLogFields: function (requestData) {
    // Add User-Agent to incoming requests
    if (isProd) {
      // @ts-ignore
      requestData.userAgent = this.get('user-agent');
    }
    return requestData;
  },
  updateResponseLogFields: function (requestData) {
    if (isProd) {
      // @ts-ignore
      requestData.status = this.status;
    }
    requestData.res = undefined;
    return requestData;
  }
});

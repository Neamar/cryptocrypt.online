import koaBunyanLogger from 'koa-bunyan-logger';

export const addRequestLogs = koaBunyanLogger.requestLogger({
  // Clean up default logs, which include hundreds of lines per request
  updateLogFields: (requestData) => {
    requestData.req = undefined;
    // @ts-ignore
    requestData.res = undefined;
    return requestData;
  }
});

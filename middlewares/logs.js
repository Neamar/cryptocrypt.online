import koaBunyanLogger from 'koa-bunyan-logger';

export const addRequestLogs = koaBunyanLogger.requestLogger({
  updateLogFields: (requestData) => {
    requestData.req = undefined;
    // @ts-ignore
    requestData.res = undefined;
    return requestData;
  }
});

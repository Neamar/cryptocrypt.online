import { isProd } from './helpers/env.js';

const config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,

  },
  pool: { min: 0, max: 10 },
};

if (isProd) {
  config.ssl = {
    // Allow self signed certificate
    rejectUnauthorized: false
  };
}

export default config;

// This file (and migrations/) intentionally stays plain JavaScript and self-contained:
// the knex CLI registers module loaders based on the knexfile extension, and a .ts
// knexfile would make it look for ts-node. Inlined from helpers/env.js.
const isProd = process.env.NODE_ENV === 'production';

/** @type {import('knex').Knex.Config & { ssl?: { rejectUnauthorized: boolean } }} */
const config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,

  },
  pool: { min: 0, max: 10 },
};

if (isProd) {
  // NOTE: a top-level `ssl` key is not a knex option (pg SSL settings belong under
  // `connection.ssl`), so this is currently a no-op. Kept as-is to avoid a behavior
  // change during the TS migration.
  config.ssl = {
    // Allow self signed certificate
    rejectUnauthorized: false
  };
}

export default config;

// This file (and migrations/) intentionally stays plain JavaScript and self-contained:
// the knex CLI registers module loaders based on the knexfile extension, and a .ts
// knexfile would make it look for ts-node.

/** @type {import('knex').Knex.Config} */
const config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
  },
  pool: { min: 0, max: 10 },
};

export default config;

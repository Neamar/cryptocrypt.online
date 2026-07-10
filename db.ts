import knex from 'knex';
// knexfile intentionally stays .js — see comment there
import dbConfig from './knexfile.js';

export default knex(dbConfig);

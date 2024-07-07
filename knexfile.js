export default {
  client: 'pg',
  connection: process.env.DB_URL,
  pool: { min: 0, max: 10 },
};

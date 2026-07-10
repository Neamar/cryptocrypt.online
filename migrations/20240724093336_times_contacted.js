/**
 * @param { import("knex").Knex } knex
 */
export const up = async function (knex) {
  await knex.schema.alterTable('crypts', function (t) {
    t.smallint('times_contacted').comment("Times a healtcheck email was sent since last refresh").defaultTo(0).notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
export const down = async function (knex) {
  await knex.schema.alterTable('crypts', function (t) {
    t.dropColumn('times_contacted');
  });
};

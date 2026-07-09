/**
 * @param { import("knex").Knex } knex
 */
export const up = async function (knex) {
  await knex.schema.alterTable('crypts', function (t) {
    t.dateTime('auth_mail_sent_at').comment("Last time an authentication (magic link) email was sent, used for cooldown").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
export const down = async function (knex) {
  await knex.schema.alterTable('crypts', function (t) {
    t.dropColumn('auth_mail_sent_at');
  });
};

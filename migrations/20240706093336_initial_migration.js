import { STATUS_EMPTY, STATUS_INVALID, STATUS_READ, STATUS_READY, STATUS_SENT } from '../models/crypt.js';

/**
 * @param { import("knex").Knex } knex
 */
export const up = async function (knex) {
  await knex.schema.createTable('crypts', function (t) {
    t.uuid('uuid').primary().notNullable();
    t.string('from_name').notNullable().defaultTo('');
    t.string('from_mail').notNullable().defaultTo('');
    t.string('to_name').notNullable().defaultTo('');
    t.string('to_mail').notNullable().defaultTo('');
    t.text('message').notNullable().defaultTo('');
    t.string('encrypted_message_name').notNullable().defaultTo('');
    t.binary('encrypted_message');
    t.enum('status', [STATUS_INVALID, STATUS_EMPTY, STATUS_READY, STATUS_SENT, STATUS_READ], { useNative: true, enumName: 'crypt_status' }).notNullable();
    t.dateTime('created_at').comment("When this crypt was created").notNullable();
    t.dateTime('updated_at').comment("When this crypt was updated (from/to/message update)").notNullable();
    t.dateTime('refreshed_at').comment("When this crypt was last refreshed (activity confirmed)").notNullable();
    t.dateTime('triggered_at').comment("When this crypt was sent to recipient");
    t.dateTime('read_at').comment("When this crypt was read by recipient");
  });

  await knex.schema.createTable('crypt_events', function (t) {
    t.increments('id').unsigned().primary().notNullable();
    t.uuid('crypt_uuid').notNullable().index();
    t.string('event').notNullable();
    t.dateTime('created_at').notNullable();
    t.string('ip').notNullable();
    t.string('user_agent').notNullable();

    t.foreign('crypt_uuid').references('uuid').inTable('crypts').onDelete('cascade').onUpdate('cascade');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
export const down = async function (knex) {
  await knex.schema.dropTable('crypts');
  await knex.schema.dropTable('crypt_events');
};

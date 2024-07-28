import test, { after, describe } from 'node:test';
import assert from 'node:assert';
import cryptHealthcheck from './crypt-healthcheck.js';
import db from '../db.js';
import { STATUS_INVALID, STATUS_READY } from '../models/crypts.js';
import { withCrypt } from '../testHelpers.js';

describe('Job: crypt-healtcheck', async () => {
  test('an invalid crypt is not sent', withCrypt(STATUS_INVALID, { refreshed_at: new Date(0) }, async (crypt, upToDateCrypt) => {
    await cryptHealthcheck();

    assert.strictEqual((await upToDateCrypt()).times_contacted, crypt.times_contacted);
  }));

  test('a crypt with refresh this month is not sent', withCrypt(STATUS_READY, async (crypt, upToDateCrypt) => {
    await cryptHealthcheck();

    assert.strictEqual((await upToDateCrypt()).times_contacted, crypt.times_contacted);
  }));

  test('a crypt with refresh last month is sent', withCrypt(STATUS_READY, { refreshed_at: new Date(0) }, async (crypt, upToDateCrypt) => {
    await cryptHealthcheck();

    assert.strictEqual((await upToDateCrypt()).times_contacted, crypt.times_contacted + 1);
  }));

  after(() => db.destroy());
});

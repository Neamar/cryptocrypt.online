import test, { after, describe } from 'node:test';
import assert from 'node:assert';
import cryptRelease from './crypt-release.js';
import db from '../db.js';
import { STATUS_INVALID, STATUS_READY, STATUS_SENT } from '../models/crypts.js';
import { withCrypt } from '../testHelpers.js';


describe('Job: crypt-healtcheck', async () => {
  test('an invalid crypt is not released', withCrypt(STATUS_INVALID, { refreshed_at: new Date(0) }, async (crypt, upToDateCrypt) => {
    await cryptRelease();

    assert.strictEqual((await upToDateCrypt()).status, STATUS_INVALID);
  }));

  test('a crypt with refresh this month is not sent', withCrypt(STATUS_READY, async (crypt, upToDateCrypt) => {
    await cryptRelease();

    assert.strictEqual((await upToDateCrypt()).status, STATUS_READY);
  }));

  test('a crypt with refresh last month is not sent', withCrypt(STATUS_READY, { refreshed_at: new Date(0) }, async (crypt, upToDateCrypt) => {
    await cryptRelease();

    assert.strictEqual((await upToDateCrypt()).status, STATUS_READY);
  }));

  test('a crypt with refresh last month and more than six contacts is sent', withCrypt(STATUS_READY, { refreshed_at: new Date(0), times_contacted: 7 }, async (crypt, upToDateCrypt) => {
    await cryptRelease();

    assert.strictEqual((await upToDateCrypt()).status, STATUS_SENT);
  }));


  after(() => db.destroy());
});

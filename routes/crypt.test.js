import test, { describe, after } from 'node:test';
import assert from 'node:assert';
import { server } from '../index.js';
import db from '../db.js';
import { internalFetch, withCrypt } from '../testHelpers.js';
import { STATUS_EMPTY } from '../models/crypts.js';

describe('GET /crypts/create', () => {
  test("should create a new crypt", async () => {
    const r = await internalFetch('/crypts/create', { method: "POST", redirect: "manual" });
    assert.strictEqual(r.status, 302);
    const location = r.headers.get('location');
    assert.match(location, new RegExp('^/crypts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/warnings$'));
  });
});

describe('GET /crypts/:uuid/warnings', () => {
  test("should return HTTP 404", async () => {
    const r = await internalFetch(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/warnings`);
    assert.strictEqual(r.status, 404);
  });

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/warnings`);
    assert.strictEqual(r.status, 200);
  }));
});

after(() => db.destroy());
after(() => server.close());

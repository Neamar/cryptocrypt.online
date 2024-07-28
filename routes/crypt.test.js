import test, { describe, after } from 'node:test';
import assert from 'node:assert';
import { server } from '../index.js';
import db from '../db.js';
import { internalFetch, withCrypt } from '../testHelpers.js';
import { STATUS_EMPTY, STATUS_READY, STATUS_SENT } from '../models/crypts.js';

const has404 = (endpoint) => {
  test("should return HTTP 404", async () => {
    const r = await internalFetch(endpoint);
    assert.strictEqual(r.status, 404);
  });
};

describe('GET /crypts/create', () => {
  test("should create a new crypt", async () => {
    const r = await internalFetch('/crypts/create', { method: "POST", redirect: "manual" });
    assert.strictEqual(r.status, 302);
    const location = r.headers.get('location');
    assert.match(location, new RegExp('^/crypts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/warnings$'));
  });
});

describe('GET /crypts/:uuid/warnings', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/warnings`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/warnings`);
    assert.strictEqual(r.status, 200);
  }));
});

describe('GET /crypts/:uuid/edit', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/edit`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/edit`);
    assert.strictEqual(r.status, 200);
  }));
});

describe('GET /crypts/:uuid/', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/`);
    assert.strictEqual(r.status, 200);
  }));
});

describe('GET /crypts/:uuid/delete', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/delete`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/delete`);
    assert.strictEqual(r.status, 200);
  }));
});


describe('GET /crypts/:uuid/healthcheck', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/healthcheck`);

  test("should return HTTP 200 and update refreshed_at", withCrypt(STATUS_READY, {
    refreshed_at: new Date(0)
  }, async (crypt, upToDateCrypt) => {
    const startDate = new Date();
    const r = await internalFetch(`/crypts/${crypt.uuid}/healthcheck`);
    assert.strictEqual(r.status, 200);
    assert.ok((await upToDateCrypt()).refreshed_at > startDate);
  }));

  test("should return HTTP 400 for a crypt that was sent", withCrypt(STATUS_SENT, {
    refreshed_at: new Date(0)
  }, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/healthcheck`);
    assert.strictEqual(r.status, 400);
    assert.strictEqual((await upToDateCrypt()).refreshed_at.toISOString(), crypt.refreshed_at.toISOString());
  }));
});

describe('POST /crypts/:uuid/delete', () => {
  test("should return HTTP 200 and delete", withCrypt(STATUS_READY, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/delete`, { method: 'POST' });
    assert.strictEqual(r.status, 200);
    assert.equal(await upToDateCrypt(), undefined);
  }));
});

after(() => db.destroy());
after(() => server.close());

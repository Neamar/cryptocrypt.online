import assert from 'node:assert';
import { after, describe, it } from 'node:test';
import { server } from '../index.ts';
import { internalFetch } from '../testHelpers.ts';

describe('GET endpoints in routes/default.ts', () => {
  it('GET / returns 200', async () => {
    const r = await internalFetch('/');
    assert.strictEqual(r.status, 200);
  });

  it('GET /donate returns 200', async () => {
    const r = await internalFetch('/donate');
    assert.strictEqual(r.status, 200);
  });

  it('GET /examples returns 200', async () => {
    const r = await internalFetch('/examples');
    assert.strictEqual(r.status, 200);
  });

  it('GET /writing returns 200', async () => {
    const r = await internalFetch('/writing');
    assert.strictEqual(r.status, 200);
  });

  it('GET /words returns 200', async () => {
    const r = await internalFetch('/words');
    assert.strictEqual(r.status, 200);
  });

  it('GET /encrypt returns 200', async () => {
    const r = await internalFetch('/encrypt');
    assert.strictEqual(r.status, 200);
  });

  it('GET /faq returns 200', async () => {
    const r = await internalFetch('/faq');
    assert.strictEqual(r.status, 200);
  });
});
after(() => server.close());

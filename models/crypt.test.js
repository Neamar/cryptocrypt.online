import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { after, describe, it } from 'node:test';
import db from '../db.js';
import { withCrypt } from '../testHelpers.js';
import { getCryptHash, logCryptEvent, STATUS_READY, validateCryptHash } from './crypt.js';

describe('getCryptHash()', () => {
  it('should generate a hash', () => {
    const crypt = { uuid: randomUUID() };
    const result = getCryptHash(crypt, 'verify-email', 'test@example.com');

    assert(result.hash, 'Hash should be defined');
    assert(result.validUntil, 'ValidUntil should be defined');
    assert.strictEqual(typeof result.hash, 'string', 'Hash should be a string');
    assert.strictEqual(typeof result.validUntil, 'number', 'ValidUntil should be a number');
  });

  it('should generate consistent hash for same inputs', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const validUntil = Date.now() + 1000000;

    const hash1 = getCryptHash(crypt, action, payload, validUntil);
    const hash2 = getCryptHash(crypt, action, payload, validUntil);

    assert.strictEqual(hash1.hash, hash2.hash, 'Same inputs should produce same hash');
    assert.strictEqual(hash1.validUntil, hash2.validUntil, 'Same inputs should produce same validUntil');
  });

  it('should generate different hashes for different actions', () => {
    const crypt = { uuid: randomUUID() };
    const payload = 'test@example.com';
    const validUntil = Date.now() + 1000000;

    const hash1 = getCryptHash(crypt, 'verify-email', payload, validUntil);
    const hash2 = getCryptHash(crypt, 'other-action', payload, validUntil);

    assert.notStrictEqual(hash1.hash, hash2.hash, 'Different actions should produce different hashes');
  });

  it('should generate different hashes for different payloads', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const validUntil = Date.now() + 1000000;

    const hash1 = getCryptHash(crypt, action, 'test1@example.com', validUntil);
    const hash2 = getCryptHash(crypt, action, 'test2@example.com', validUntil);

    assert.notStrictEqual(hash1.hash, hash2.hash, 'Different payloads should produce different hashes');
  });

  it('should generate different hashes for different crypt UUIDs', () => {
    const crypt1 = { uuid: randomUUID() };
    const crypt2 = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const validUntil = Date.now() + 1000000;

    const hash1 = getCryptHash(crypt1, action, payload, validUntil);
    const hash2 = getCryptHash(crypt2, action, payload, validUntil);

    assert.notStrictEqual(hash1.hash, hash2.hash, 'Different UUIDs should produce different hashes');
  });

  it('should generate hash as 64-character hex string (SHA-256)', () => {
    const crypt = { uuid: randomUUID() };
    const result = getCryptHash(crypt, 'verify-email', 'test@example.com');

    assert.match(result.hash, /^[a-f0-9]{64}$/, 'Hash should be 64-char hex string (SHA-256)');
  });

  it('should default validUntil to approximately 1 year from now', () => {
    const crypt = { uuid: randomUUID() };
    const beforeCall = Date.now();
    const result = getCryptHash(crypt, 'verify-email', 'test@example.com');
    const afterCall = Date.now();

    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    assert(result.validUntil > beforeCall + oneYearMs - 100, 'ValidUntil should be approximately 1 year from now');
    assert(result.validUntil < afterCall + oneYearMs + 100, 'ValidUntil should be approximately 1 year from now');
  });

  it('should allow custom validUntil', () => {
    const crypt = { uuid: randomUUID() };
    const customValidUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const result = getCryptHash(crypt, 'verify-email', 'test@example.com', customValidUntil);

    assert.strictEqual(result.validUntil, customValidUntil, 'Should use provided validUntil');
  });
});

describe('validateCryptHash()', () => {
  it('should return true for valid hash and non-expired token', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const futureTime = Date.now() + 10000;

    const { hash, validUntil } = getCryptHash(crypt, action, payload, futureTime);
    const isValid = validateCryptHash(crypt, action, payload, hash, validUntil);

    assert.strictEqual(isValid, true, 'Should validate correct hash with future validUntil');
  });

  it('should return false for expired token', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const pastTime = Date.now() - 10000;

    const { hash } = getCryptHash(crypt, action, payload, pastTime);
    const isValid = validateCryptHash(crypt, action, payload, hash, pastTime);

    assert.strictEqual(isValid, false, 'Should reject expired token');
  });

  it('should return false for mismatched hash', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const futureTime = Date.now() + 10000;

    getCryptHash(crypt, action, payload, futureTime);
    const wrongHash = 'a'.repeat(64);
    const isValid = validateCryptHash(crypt, action, payload, wrongHash, futureTime);

    assert.strictEqual(isValid, false, 'Should reject mismatched hash');
  });

  it('should return false for wrong action', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const futureTime = Date.now() + 10000;

    const { hash, validUntil } = getCryptHash(crypt, action, payload, futureTime);
    // @ts-expect-error testing wrong action
    const isValid = validateCryptHash(crypt, 'wrong-action', payload, hash, validUntil);

    assert.strictEqual(isValid, false, 'Should reject wrong action');
  });

  it('should return false for wrong payload', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const futureTime = Date.now() + 10000;

    const { hash, validUntil } = getCryptHash(crypt, action, payload, futureTime);
    const isValid = validateCryptHash(crypt, action, 'wrong@example.com', hash, validUntil);

    assert.strictEqual(isValid, false, 'Should reject wrong payload');
  });

  it('should return false for wrong crypt UUID', () => {
    const crypt1 = { uuid: randomUUID() };
    const crypt2 = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const futureTime = Date.now() + 10000;

    const { hash, validUntil } = getCryptHash(crypt1, action, payload, futureTime);
    const isValid = validateCryptHash(crypt2, action, payload, hash, validUntil);

    assert.strictEqual(isValid, false, 'Should reject wrong crypt UUID');
  });

  it('should convert string validUntil to number', () => {
    const crypt = { uuid: randomUUID() };
    const action = 'verify-email';
    const payload = 'test@example.com';
    const futureTime = Date.now() + 10000;

    const { hash, validUntil } = getCryptHash(crypt, action, payload, futureTime);
    // @ts-expect-error testing wrong type
    const isValid = validateCryptHash(crypt, action, payload, hash, String(validUntil));

    assert.strictEqual(isValid, true, 'Should handle string validUntil and convert to number');
  });
});

describe('logCryptEvent()', () => {
  it('should insert event into crypt_events table', withCrypt(STATUS_READY, async (crypt) => {
    const mockContext = {
      request: { ip: '192.168.1.1' },
      header: { 'user-agent': 'test-agent' }
    };

    await logCryptEvent(crypt.uuid, 'Test event', mockContext);

    const event = await db('crypt_events')
      .where('crypt_uuid', crypt.uuid)
      .where('event', 'Test event')
      .first();

    assert(event, 'Event should be inserted into database');
    assert.strictEqual(event.crypt_uuid, crypt.uuid, 'Event should have correct crypt_uuid');
    assert.strictEqual(event.event, 'Test event', 'Event should have correct event text');
  }));

  it('should capture IP from context', withCrypt(STATUS_READY, async (crypt) => {
    const testIP = '10.20.30.40';

    const mockContext = {
      request: { ip: testIP },
      header: { 'user-agent': 'test-agent' }
    };

    await logCryptEvent(crypt.uuid, 'IP test', mockContext);

    const event = await db('crypt_events')
      .where('crypt_uuid', crypt.uuid)
      .where('event', 'IP test')
      .first();

    assert.strictEqual(event.ip, testIP, 'Event should capture correct IP');
  }));

  it('should capture user-agent from context', withCrypt(STATUS_READY, async (crypt) => {
    const testUserAgent = 'Mozilla/5.0 Test Browser';

    const mockContext = {
      request: { ip: '192.168.1.1' },
      header: { 'user-agent': testUserAgent }
    };

    await logCryptEvent(crypt.uuid, 'User-agent test', mockContext);

    const event = await db('crypt_events')
      .where('crypt_uuid', crypt.uuid)
      .where('event', 'User-agent test')
      .first();

    assert.strictEqual(event.user_agent, testUserAgent, 'Event should capture correct user-agent');
  }));

  it('should use "unknown" for missing user-agent', withCrypt(STATUS_READY, async (crypt) => {
    const mockContext = {
      request: { ip: '192.168.1.1' },
      header: {} // No user-agent header
    };

    await logCryptEvent(crypt.uuid, 'Missing user-agent test', mockContext);

    const event = await db('crypt_events')
      .where('crypt_uuid', crypt.uuid)
      .where('event', 'Missing user-agent test')
      .first();

    assert.strictEqual(event.user_agent, 'unknown', 'Missing user-agent should default to "unknown"');
  }));

  it('should record creation timestamp', withCrypt(STATUS_READY, async (crypt) => {
    const beforeCall = Date.now();

    const mockContext = {
      request: { ip: '192.168.1.1' },
      header: { 'user-agent': 'test-agent' }
    };

    await logCryptEvent(crypt.uuid, 'Timestamp test', mockContext);
    const afterCall = Date.now();

    const event = await db('crypt_events')
      .where('crypt_uuid', crypt.uuid)
      .where('event', 'Timestamp test')
      .first();

    const eventTime = new Date(event.created_at).getTime();
    assert(eventTime >= beforeCall - 100 && eventTime <= afterCall + 100, 'Event timestamp should be recent');
  }));

  it('should correctly associate event with crypt UUID', withCrypt(STATUS_READY, async (crypt) => {
    const crypt2 = (await db('crypts').insert({ uuid: randomUUID(), status: STATUS_READY, created_at: new Date(), updated_at: new Date(), refreshed_at: new Date() }, ['uuid']))[0];

    const mockContext = {
      request: { ip: '192.168.1.1' },
      header: { 'user-agent': 'test-agent' }
    };

    await logCryptEvent(crypt.uuid, 'Event for crypt1', mockContext);
    await logCryptEvent(crypt2.uuid, 'Event for crypt2', mockContext);

    const events1 = await db('crypt_events').where('crypt_uuid', crypt.uuid);
    const events2 = await db('crypt_events').where('crypt_uuid', crypt2.uuid);

    const event1 = events1.find(e => e.event === 'Event for crypt1');
    const event2 = events2.find(e => e.event === 'Event for crypt2');

    assert(event1, 'Event for crypt1 should exist');
    assert(event2, 'Event for crypt2 should exist');
    assert.strictEqual(event1.crypt_uuid, crypt.uuid, 'Event 1 should be associated with crypt1');
    assert.strictEqual(event2.crypt_uuid, crypt2.uuid, 'Event 2 should be associated with crypt2');
  }));
});

// Clean up database connection after all tests
after(async () => {
  await db.destroy();
});

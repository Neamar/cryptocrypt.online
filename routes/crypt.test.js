import assert from 'node:assert';
import test, { after, describe } from 'node:test';
import db from '../db.js';
import { lastMail } from '../helpers/mail.js';
import { server } from '../index.js';
import { cryptLink, getCryptHash, STATUS_EMPTY, STATUS_INVALID, STATUS_READ, STATUS_READY, STATUS_SENT } from '../models/crypt.js';
import { internalFetch, withCrypt } from '../testHelpers.js';

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
    assert.match(location, /^\/crypts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/warnings$/);
  });
});

describe('GET /crypts/:uuid/warnings', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/warnings`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/warnings`);
    assert.strictEqual(r.status, 200);
  }));
});

describe('GET /crypts/:uuid/verify', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/verify`);

  test("should return HTTP 200", withCrypt(STATUS_INVALID, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/verify`);
    assert.strictEqual(r.status, 200);
  }));

  test("should send an email, and email should include validation", withCrypt(STATUS_INVALID, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        from_mail: 'foo@bar.com',
      }),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(lastMail.to, 'foo@bar.com');
    const link = lastMail.html.match(`(/crypts/${crypt.uuid}/verify-from-email.+?)"`);
    assert(link, "No valid link found");

    let updatedCrypt = await upToDateCrypt();
    assert(updatedCrypt.status, STATUS_INVALID);
    assert(updatedCrypt.from_mail, 'foo@bar.com');
    assert(link[1].includes('?hash='), 'Missing hash value');
    assert(link[1].includes('&amp;validUntil='), 'Missing validUntil value');
  }));
});

describe('GET /crypts/:uuid/verify-from-email', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/verify-from-email`);

  test("should fail validation with invalid code", withCrypt(STATUS_INVALID, { from_mail: 'foo@bar.com' }, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(cryptLink(crypt, 'verify-from-email'));

    assert.strictEqual(r.status, 200);
    assert((await upToDateCrypt()).status, STATUS_INVALID);
    assert(r.url.includes('/verify'), 'Invalid code should redirect');
  }));

  test("should fail validation with invalid code", withCrypt(STATUS_INVALID, { from_mail: 'foo@bar.com' }, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`${cryptLink(crypt, 'verify-from-email')}?hash=abc`);

    assert.strictEqual(r.status, 200);
    assert((await upToDateCrypt()).status, STATUS_INVALID);
    assert(r.url.includes('/verify'), 'Invalid code should redirect');
  }));

  test("should fail validation with invalid code", withCrypt(STATUS_INVALID, { from_mail: 'foo@bar.com' }, async (crypt, upToDateCrypt) => {
    const hash = getCryptHash(crypt, 'verify-email', 'foo@bar.com', Date.now() + 10000);
    const r = await internalFetch(`${cryptLink(crypt, 'verify-from-email')}?hash=${hash.hash}&validUntil=123`);

    assert.strictEqual(r.status, 200);
    assert((await upToDateCrypt()).status, STATUS_INVALID);
    assert(r.url.includes('/verify'), 'Invalid code should redirect');
  }));

  test("should succeed with valid code", withCrypt(STATUS_INVALID, { from_mail: 'foo@bar.com' }, async (crypt, upToDateCrypt) => {
    const hash = getCryptHash(crypt, 'verify-email', 'foo@bar.com', Date.now() + 10000);
    const r = await internalFetch(`${cryptLink(crypt, 'verify-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`);

    assert.strictEqual(r.status, 200);
    assert((await upToDateCrypt()).status, STATUS_EMPTY);
    assert(r.url.includes('/edit'), 'Invalid code should redirect');
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

describe('GET /crypts/:uuid/read', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/read`);

  test("should return HTTP 200", withCrypt(STATUS_READY, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/read`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await upToDateCrypt()).status, crypt.status);
    assert.equal((await upToDateCrypt()).read_at, undefined);
  }));

  test("should return HTTP 200 and mark READ when SENT", withCrypt(STATUS_SENT, async (crypt, upToDateCrypt) => {
    const startDate = new Date();
    const r = await internalFetch(`/crypts/${crypt.uuid}/read`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await upToDateCrypt()).status, STATUS_READ);
    assert.ok((await upToDateCrypt()).read_at > startDate);

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

  test("should redirect for a crypt that was sent", withCrypt(STATUS_SENT, {
    refreshed_at: new Date(0)
  }, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/healthcheck`);
    assert.strictEqual(r.status, 200);
    assert(r.redirected, 'Request should have redirected');
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

describe('POST /crypts/:uuid/edit', () => {
  test("should not save from_mail", withCrypt(STATUS_EMPTY, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, {
      method: 'POST',
      body: JSON.stringify({
        from_mail: 'foo@bar.com',
      }),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    const updatedCrypt = await upToDateCrypt();
    assert.notEqual(updatedCrypt.from_mail, 'foo@bar.com');
    assert.equal(updatedCrypt.status, STATUS_EMPTY);
  }));

  test("should save sent data", withCrypt(STATUS_EMPTY, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, {
      method: 'POST',
      body: JSON.stringify({
        from_name: 'Testing McTestFace',
      }),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    const updatedCrypt = await upToDateCrypt();
    assert.equal(updatedCrypt.from_name, 'Testing McTestFace');
    assert.equal(updatedCrypt.status, STATUS_EMPTY);
  }));

  test("should keep names as single lines", withCrypt(STATUS_EMPTY, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, {
      method: 'POST',
      body: JSON.stringify({
        from_name: 'Matt\nB',
      }),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    const updatedCrypt = await upToDateCrypt();
    assert.equal(updatedCrypt.from_name, 'Matt B');
    assert.equal(updatedCrypt.status, STATUS_EMPTY);
  }));

  test("should set status to VALID with correct payload", withCrypt(STATUS_EMPTY, async (crypt, upToDateCrypt) => {
    const payload = {
      from_name: 'From',
      to_name: 'To',
      to_mail: 'to@cryptocrypt.online',
      message: 'message',
    };

    const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    const updatedCrypt = await upToDateCrypt();
    // Everything saved
    Object.entries(payload).forEach(([key, value]) => {
      assert.equal(updatedCrypt[key], value);
    });
    // Status updated
    assert.equal(updatedCrypt.status, STATUS_READY);
  }));
});

describe("Test happy path", () => {
  test("should allow crypt edition end to end", withCrypt(STATUS_INVALID, async (crypt, upToDateCrypt) => {
    // Verify email
    let r = await internalFetch(`/crypts/${crypt.uuid}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        from_mail: 'foo@bar.com',
      }),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(lastMail.to, 'foo@bar.com');

    // Click on mail link
    const link = lastMail.html.match(`(/crypts/${crypt.uuid}/.+?)"`);
    assert(link, "No valid link found");

    let updatedCrypt = await upToDateCrypt();
    assert(updatedCrypt.status, STATUS_INVALID);
    assert(updatedCrypt.from_mail, 'foo@bar.com');

    r = await internalFetch(link[1]);

    assert.strictEqual(r.status, 200);
    updatedCrypt = await upToDateCrypt();
    assert(updatedCrypt.status, STATUS_EMPTY);
    assert(updatedCrypt.from_mail, 'foo@bar.com');

    // Edit content
    r = await internalFetch(`/crypts/${crypt.uuid}/edit`, {
      method: 'POST',
      body: JSON.stringify({
        from_name: 'Foo',
        to_name: 'Them',
        to_mail: 'them@isp.com',
        message: 'I love you'
      }),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
    });
    assert.strictEqual(r.status, 200);
    updatedCrypt = await upToDateCrypt();
    assert(updatedCrypt.status, STATUS_READY);
    assert(updatedCrypt.message, 'I love you');
  }));

});

describe('GET /crypts/:uuid/file', () => {
  has404('/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/file');

  test('should return 404 if crypt has no file', withCrypt(STATUS_READY, async (crypt) => {
    // withCrypt creates a crypt without an encrypted_message file
    const r = await internalFetch(`/crypts/${crypt.uuid}/file`);
    assert.strictEqual(r.status, 404);
  }));

  test('should return 200 with file content when file exists', withCrypt(STATUS_READY, async (crypt) => {
    // Upload a file by editing the crypt
    const testFileName = 'test-message.txt';
    const testContent = 'This is encrypted content';

    // Update crypt directly with file data
    await db('crypts').where('uuid', crypt.uuid).update({
      encrypted_message: Buffer.from(testContent),
      encrypted_message_name: testFileName,
    });

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`);
    assert.strictEqual(r.status, 200);

    // Check response content type
    const body = await r.arrayBuffer();
    const bodyString = Buffer.from(body).toString();
    assert.strictEqual(bodyString, testContent, 'Response body should contain file content');
  }));

  test('should set correct content-disposition header with filename', withCrypt(STATUS_READY, async (crypt) => {
    const testFileName = 'my-encrypted-message.dat';

    await db('crypts').where('uuid', crypt.uuid).update({
      encrypted_message: Buffer.from('encrypted data'),
      encrypted_message_name: testFileName,
    });

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`);
    const contentDisposition = r.headers.get('content-disposition');

    assert(contentDisposition, 'content-disposition header should be set');
    assert(contentDisposition.includes('attachment'), 'Should be an attachment');
    assert(contentDisposition.includes(`filename="${testFileName}"`), `Should include filename "${testFileName}"`);
  }));

  test('should return correct binary file content', withCrypt(STATUS_READY, async (crypt) => {
    // Test with binary data
    const binaryData = Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x02, 0x03]);

    await db('crypts').where('uuid', crypt.uuid).update({
      encrypted_message: binaryData,
      encrypted_message_name: 'binary-file.bin',
    });

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`);
    const responseBuffer = await r.arrayBuffer();

    assert.deepStrictEqual(Buffer.from(responseBuffer), binaryData, 'Response should contain correct binary content');
  }));

  test('should handle files with special characters in filename', withCrypt(STATUS_READY, async (crypt) => {
    const specialFileName = 'my-encrypted-message-2024.enc';

    await db('crypts').where('uuid', crypt.uuid).update({
      encrypted_message: Buffer.from('content'),
      encrypted_message_name: specialFileName,
    });

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`);
    const contentDisposition = r.headers.get('content-disposition');

    assert(contentDisposition.includes(`filename="${specialFileName}"`), 'Should preserve special characters in filename');
  }));
});


after(() => db.destroy());
after(() => server.close());

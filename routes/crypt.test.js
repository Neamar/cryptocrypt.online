import test, { describe, after } from 'node:test';
import assert from 'node:assert';
import { server } from '../index.js';
import db from '../db.js';
import { authCookie, internalFetch, withCrypt } from '../testHelpers.js';
import { cryptLink, getCryptHash, STATUS_EMPTY, STATUS_INVALID, STATUS_READ, STATUS_READY, STATUS_SENT } from '../models/crypt.js';
import { lastMail } from '../helpers/mail.js';

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

    const updatedCrypt = await upToDateCrypt();
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

  test("should succeed with valid code and set the auth cookie", withCrypt(STATUS_INVALID, { from_mail: 'foo@bar.com' }, async (crypt, upToDateCrypt) => {
    const hash = getCryptHash(crypt, 'verify-email', 'foo@bar.com', Date.now() + 10000);
    const r = await internalFetch(`${cryptLink(crypt, 'verify-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`, { redirect: 'manual' });

    assert.strictEqual(r.status, 302);
    assert.strictEqual((await upToDateCrypt()).status, STATUS_EMPTY);
    assert.strictEqual(r.headers.get('location'), cryptLink(crypt, 'edit'));
    const setCookie = r.headers.get('set-cookie');
    assert(setCookie && setCookie.includes(`auth-${crypt.uuid}=`), 'Response should set the auth cookie');
  }));
});

describe('GET /crypts/:uuid/edit', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/edit`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, { headers: { Cookie: authCookie(crypt) } });
    assert.strictEqual(r.status, 200);
  }));
});

describe('GET /crypts/:uuid/', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223`);

  test("should return HTTP 200", withCrypt(STATUS_EMPTY, async (crypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/`, { headers: { Cookie: authCookie(crypt) } });
    assert.strictEqual(r.status, 200);
  }));
});

describe('GET /crypts/:uuid/read', () => {
  has404(`/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/read`);

  test("should return HTTP 200", withCrypt(STATUS_READY, async (crypt, upToDateCrypt) => {
    const r = await internalFetch(`/crypts/${crypt.uuid}/read`, { headers: { Cookie: authCookie(crypt) } });
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
    const r = await internalFetch(`/crypts/${crypt.uuid}/delete`, { headers: { Cookie: authCookie(crypt) } });
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
    const refreshedAt = (await upToDateCrypt()).refreshed_at;
    assert.ok(refreshedAt >= startDate, `refreshed_at should be updated (got ${refreshedAt}); now is ${new Date()}`);
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
    const r = await internalFetch(`/crypts/${crypt.uuid}/delete`, { method: 'POST', headers: { Cookie: authCookie(crypt) } });
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
        'Content-Type': 'application/json',
        Cookie: authCookie(crypt)
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
        'Content-Type': 'application/json',
        Cookie: authCookie(crypt)
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
        'Content-Type': 'application/json',
        Cookie: authCookie(crypt)
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
        'Content-Type': 'application/json',
        Cookie: authCookie(crypt)
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

    // Click on mail link (email links are HTML-encoded, so decode &amp; back to &)
    const link = lastMail.html.match(`(/crypts/${crypt.uuid}/.+?)"`);
    assert(link, "No valid link found");
    const verifyLink = link[1].replace(/&amp;/g, '&');

    let updatedCrypt = await upToDateCrypt();
    assert(updatedCrypt.status, STATUS_INVALID);
    assert(updatedCrypt.from_mail, 'foo@bar.com');

    // Following the verify link authenticates the browser (sets the auth cookie)
    r = await internalFetch(verifyLink, { redirect: 'manual' });

    assert.strictEqual(r.status, 302);
    assert.strictEqual(r.headers.get('location'), cryptLink(crypt, 'edit'));
    updatedCrypt = await upToDateCrypt();
    assert.strictEqual(updatedCrypt.status, STATUS_EMPTY);
    assert.strictEqual(updatedCrypt.from_mail, 'foo@bar.com');

    const setCookie = r.headers.get('set-cookie');
    assert(setCookie && setCookie.includes(`auth-${crypt.uuid}=`), 'Verify link should set the auth cookie');
    // Reuse the issued cookie (browsers scope it to this crypt path) for the next request
    const cookie = setCookie.split(';')[0];

    // Edit content, proving the auth cookie unlocks the gated route
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
        'Content-Type': 'application/json',
        Cookie: cookie
      },
    });
    assert.strictEqual(r.status, 200);
    updatedCrypt = await upToDateCrypt();
    assert.strictEqual(updatedCrypt.status, STATUS_READY);
    assert.strictEqual(updatedCrypt.message, 'I love you');
  }));

});


describe('GET /crypts/:uuid/file', () => {
  has404('/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/file');

  test('should return 404 if crypt has no file', withCrypt(STATUS_READY, async (crypt) => {
    // withCrypt creates a crypt without an encrypted_message file
    const r = await internalFetch(`/crypts/${crypt.uuid}/file`, { headers: { Cookie: authCookie(crypt) } });
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

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`, { headers: { Cookie: authCookie(crypt) } });
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

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`, { headers: { Cookie: authCookie(crypt) } });
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

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`, { headers: { Cookie: authCookie(crypt) } });
    const responseBuffer = await r.arrayBuffer();

    assert.deepStrictEqual(Buffer.from(responseBuffer), binaryData, 'Response should contain correct binary content');
  }));

  test('should handle files with special characters in filename', withCrypt(STATUS_READY, async (crypt) => {
    const specialFileName = 'my-encrypted-message-2024.enc';

    await db('crypts').where('uuid', crypt.uuid).update({
      encrypted_message: Buffer.from('content'),
      encrypted_message_name: specialFileName,
    });

    const r = await internalFetch(`/crypts/${crypt.uuid}/file`, { headers: { Cookie: authCookie(crypt) } });
    const contentDisposition = r.headers.get('content-disposition');

    assert(contentDisposition.includes(`filename="${specialFileName}"`), 'Should preserve special characters in filename');
  }));
});



describe('Owner authentication', () => {
  describe('Dashboard challenge', () => {
    test('should send a magic link and return 401 for an unauthenticated ready crypt', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt, upToDateCrypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 401);

      const body = await r.text();
      // The full link must never be shown to an unauthenticated visitor, only the masked email.
      assert(body.includes('f***@bar.com'), 'Page should show the masked email');
      assert(!body.includes('/auth-from-email'), 'Page must not leak the sign-in link');

      // The email carries the actual sign-in link.
      assert.strictEqual(lastMail.to, 'foo@bar.com');
      assert(lastMail.html.includes(`/crypts/${crypt.uuid}/auth-from-email`), 'Mail should contain the sign-in link');
      assert(lastMail.html.includes('hash='), 'Mail link should contain a hash');
      assert(lastMail.html.includes('validUntil='), 'Mail link should contain validUntil');

      assert.ok((await upToDateCrypt()).auth_mail_sent_at, 'auth_mail_sent_at should be set');

      const events = await db('crypt_events').where('crypt_uuid', crypt.uuid).where('event', 'Authentication email sent');
      assert.strictEqual(events.length, 1, 'An "Authentication email sent" event should be logged');
    }));

    test('should challenge empty crypts too', withCrypt(STATUS_EMPTY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 401);
    }));

    test('should NOT send a second mail within the cooldown window', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com', auth_mail_sent_at: new Date() }, async (crypt, upToDateCrypt) => {
      const previousMail = lastMail;
      const previousSentAt = (await upToDateCrypt()).auth_mail_sent_at;

      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 401);
      assert.strictEqual(lastMail, previousMail, 'No new mail should have been sent during cooldown');
      assert.strictEqual((await upToDateCrypt()).auth_mail_sent_at.toISOString(), previousSentAt.toISOString(), 'auth_mail_sent_at should be unchanged');
    }));

    test('should resend a mail after the cooldown expired', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com', auth_mail_sent_at: new Date(Date.now() - 16 * 60 * 1000) }, async (crypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 401);
      assert.strictEqual(lastMail.to, 'foo@bar.com');
      assert(lastMail.html.includes(`/crypts/${crypt.uuid}/auth-from-email`), 'A fresh sign-in link should be emailed');
    }));

    test('should reject a garbage cookie', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}`, { headers: { Cookie: `auth-${crypt.uuid}=not-a-valid-cookie` } });
      assert.strictEqual(r.status, 401);
    }));

    test('should reject an expired forged cookie', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const { hash, validUntil } = getCryptHash(crypt, 'auth', crypt.from_mail, Date.now() - 1000);
      const r = await internalFetch(`/crypts/${crypt.uuid}`, { headers: { Cookie: `auth-${crypt.uuid}=${hash}.${validUntil}` } });
      assert.strictEqual(r.status, 401);
    }));

    test('should reject a cookie forged for another uuid', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const otherCrypt = { uuid: 'ca761232-ed42-11ce-bacd-00aa0057b223', from_mail: crypt.from_mail };
      const { hash, validUntil } = getCryptHash(otherCrypt, 'auth', otherCrypt.from_mail, Date.now() + 10000);
      const r = await internalFetch(`/crypts/${crypt.uuid}`, { headers: { Cookie: `auth-${crypt.uuid}=${hash}.${validUntil}` } });
      assert.strictEqual(r.status, 401);
    }));

    test('should NOT challenge a sent crypt', withCrypt(STATUS_SENT, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const previousMail = lastMail;
      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 200);
      assert.strictEqual(lastMail, previousMail, 'No mail should be sent for a published crypt');
    }));

    test('should NOT challenge a read crypt', withCrypt(STATUS_READ, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 200);
    }));

    test('should NOT challenge an invalid crypt', withCrypt(STATUS_INVALID, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const previousMail = lastMail;
      const r = await internalFetch(`/crypts/${crypt.uuid}`);
      assert.strictEqual(r.status, 200);
      assert.strictEqual(lastMail, previousMail, 'No mail should be sent for an invalid crypt');
    }));
  });

  describe('Gated routes without a cookie', () => {
    test('GET /edit redirects to dashboard', withCrypt(STATUS_EMPTY, async (crypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, { redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert.strictEqual(r.headers.get('location'), cryptLink(crypt, ''));
    }));

    test('POST /edit redirects and leaves the crypt unchanged', withCrypt(STATUS_EMPTY, async (crypt, upToDateCrypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}/edit`, {
        method: 'POST',
        redirect: 'manual',
        body: JSON.stringify({ from_name: 'Hacker' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(r.status, 302);
      assert.strictEqual(r.headers.get('location'), cryptLink(crypt, ''));
      assert.strictEqual((await upToDateCrypt()).from_name, crypt.from_name);
    }));

    test('POST /delete redirects and keeps the crypt alive', withCrypt(STATUS_READY, async (crypt, upToDateCrypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}/delete`, { method: 'POST', redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert.strictEqual(r.headers.get('location'), cryptLink(crypt, ''));
      assert.ok(await upToDateCrypt(), 'Crypt should still exist');
    }));

    test('GET /read on a ready crypt redirects', withCrypt(STATUS_READY, async (crypt) => {
      const r = await internalFetch(`/crypts/${crypt.uuid}/read`, { redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert.strictEqual(r.headers.get('location'), cryptLink(crypt, ''));
    }));

    test('GET /file on a sent crypt stays accessible without a cookie', withCrypt(STATUS_SENT, async (crypt) => {
      await db('crypts').where('uuid', crypt.uuid).update({
        encrypted_message: Buffer.from('published content'),
        encrypted_message_name: 'published.txt',
      });
      const r = await internalFetch(`/crypts/${crypt.uuid}/file`);
      assert.strictEqual(r.status, 200);
      const body = Buffer.from(await r.arrayBuffer()).toString();
      assert.strictEqual(body, 'published content');
    }));
  });

  describe('GET /crypts/:uuid/auth-from-email', () => {
    has404('/crypts/ca761232-ed42-11ce-bacd-00aa0057b223/auth-from-email');

    test('valid hash sets the auth cookie and unlocks /edit', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const hash = getCryptHash(crypt, 'auth-email', 'foo@bar.com', Date.now() + 10000);
      const r = await internalFetch(`${cryptLink(crypt, 'auth-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`, { redirect: 'manual' });

      assert.strictEqual(r.status, 302);
      assert.strictEqual(r.headers.get('location'), cryptLink(crypt, ''));
      const setCookie = r.headers.get('set-cookie');
      assert(setCookie && setCookie.includes(`auth-${crypt.uuid}=`), 'Should set the auth cookie');
      // No trailing slash: browsers would not send a "/crypts/<uuid>/"-scoped cookie to "/crypts/<uuid>"
      assert(setCookie.includes(`path=/crypts/${crypt.uuid};`), 'Cookie path should be scoped to the crypt, without a trailing slash');

      const events = await db('crypt_events').where('crypt_uuid', crypt.uuid).where('event', 'Crypt owner authenticated');
      assert.strictEqual(events.length, 1, 'A "Crypt owner authenticated" event should be logged');

      // The issued cookie should unlock the gated route
      const cookie = setCookie.split(';')[0];
      const edit = await internalFetch(`/crypts/${crypt.uuid}/edit`, { headers: { Cookie: cookie } });
      assert.strictEqual(edit.status, 200);
    }));

    test('valid hash clears the auth-mail cooldown', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com', auth_mail_sent_at: new Date() }, async (crypt, upToDateCrypt) => {
      const hash = getCryptHash(crypt, 'auth-email', 'foo@bar.com', Date.now() + 10000);
      const r = await internalFetch(`${cryptLink(crypt, 'auth-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`, { redirect: 'manual' });

      assert.strictEqual(r.status, 302);
      assert.strictEqual((await upToDateCrypt()).auth_mail_sent_at, null, 'auth_mail_sent_at should be reset so a fresh link can be requested from another device');
    }));

    test('missing hash redirects without a cookie', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const r = await internalFetch(cryptLink(crypt, 'auth-from-email'), { redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert(!(r.headers.get('set-cookie') || '').includes(`auth-${crypt.uuid}=`), 'No auth cookie should be set');
    }));

    test('wrong hash redirects without a cookie', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const r = await internalFetch(`${cryptLink(crypt, 'auth-from-email')}?hash=abc&validUntil=${Date.now() + 10000}`, { redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert(!(r.headers.get('set-cookie') || '').includes(`auth-${crypt.uuid}=`), 'No auth cookie should be set');
    }));

    test('expired hash redirects without a cookie', withCrypt(STATUS_READY, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const hash = getCryptHash(crypt, 'auth-email', 'foo@bar.com', Date.now() - 1000);
      const r = await internalFetch(`${cryptLink(crypt, 'auth-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`, { redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert(!(r.headers.get('set-cookie') || '').includes(`auth-${crypt.uuid}=`), 'No auth cookie should be set');
    }));

    test('sent crypt is redirected by the status guard', withCrypt(STATUS_SENT, { from_mail: 'foo@bar.com' }, async (crypt) => {
      const hash = getCryptHash(crypt, 'auth-email', 'foo@bar.com', Date.now() + 10000);
      const r = await internalFetch(`${cryptLink(crypt, 'auth-from-email')}?hash=${hash.hash}&validUntil=${hash.validUntil}`, { redirect: 'manual' });
      assert.strictEqual(r.status, 302);
      assert(!(r.headers.get('set-cookie') || '').includes(`auth-${crypt.uuid}=`), 'No auth cookie should be set');
    }));
  });
});


after(() => db.destroy());
after(() => server.close());

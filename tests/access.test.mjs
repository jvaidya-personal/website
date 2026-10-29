// node --test tests/  — verifies the Access JWT check with a locally generated key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../functions/_lib/access.js';

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }));
const env = { CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CF_ACCESS_AUD: 'aud1' };
async function jwt(payload) {
  const h = enc({ alg: 'RS256', kid: 'k1' }), p = enc(payload);
  const s = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`))).toString('base64url');
  return `${h}.${p}.${s}`;
}
const req = (email, token) => new Request('https://x/api/admin/files', { headers: { 'Cf-Access-Authenticated-User-Email': email, ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}) } });
const now = Math.floor(Date.now() / 1000);
const good = { aud: ['aud1'], email: 'alicia.woodrow@gmail.com', exp: now + 600, iss: 'https://team.cloudflareaccess.com' };

test('valid JWT + allowed email passes', async () => {
  assert.deepEqual(await authorize(req('alicia.woodrow@gmail.com', await jwt(good)), env), { email: 'alicia.woodrow@gmail.com' });
});
for (const [name, email, payload] of [
  ['wrong aud', 'alicia.woodrow@gmail.com', { ...good, aud: ['other'] }],
  ['expired', 'alicia.woodrow@gmail.com', { ...good, exp: now - 10 }],
  ['email mismatch', 'jitendra.vaidya@gmail.com', good],
  ['not an admin', 'x@example.com', { ...good, email: 'x@example.com' }],
]) test(`${name} -> 403`, async () => assert.equal((await authorize(req(email, await jwt(payload)), env)).status, 403));
test('tampered signature -> 403', async () => {
  const t = await jwt(good); const [h, , s] = t.split('.');
  assert.equal((await authorize(req('alicia.woodrow@gmail.com', `${h}.${enc({ ...good, exp: now + 99999 })}.${s}`), env)).status, 403);
});

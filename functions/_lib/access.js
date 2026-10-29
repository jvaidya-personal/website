// Cloudflare Access verification for /api/admin/*.
// Defence in depth: Cloudflare Access already sits in front of these paths, but we
// also verify here so a misconfigured Access app can never expose the editor.

const DEFAULT_ADMINS = 'jitendra.vaidya@gmail.com,alicia.woodrow@gmail.com';
let certCache = { url: null, at: 0, keys: null };

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function getKeys(teamDomain) {
  const url = `https://${teamDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/cdn-cgi/access/certs`;
  if (certCache.url === url && Date.now() - certCache.at < 10 * 60 * 1000) return certCache.keys;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`certs fetch failed: ${res.status}`);
  const { keys } = await res.json();
  certCache = { url, at: Date.now(), keys };
  return keys;
}

export async function verifyAccessJwt(token, env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN, aud = env.CF_ACCESS_AUD;
  if (!team || !aud) throw new Error('CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD not configured');
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('malformed JWT');
  const header = b64urlJson(h), payload = b64urlJson(p);
  if (header.alg !== 'RS256') throw new Error('unexpected alg');
  const jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error('bad signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('expired');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('not yet valid');
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) throw new Error('aud mismatch');
  const iss = `https://${team.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  if (payload.iss && payload.iss !== iss) throw new Error('iss mismatch');
  return payload;
}

const forbidden = (msg) => new Response(JSON.stringify({ error: 'forbidden', detail: msg }), { status: 403, headers: { 'content-type': 'application/json' } });

// Returns { email } on success, or a 403 Response.
export async function authorize(request, env) {
  const email = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
  if (!email) return forbidden('missing Cf-Access-Authenticated-User-Email');
  const admins = (env.ADMIN_EMAILS || DEFAULT_ADMINS).split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(email)) return forbidden('email not allowed');

  // Local development only: `wrangler pages dev` with DEV_SKIP_ACCESS_JWT=1 in .dev.vars.
  // Never set this variable in the Cloudflare Pages project.
  const devSkip = env.DEV_SKIP_ACCESS_JWT === '1' || env.DEV_SKIP_ACCESS_JWT === 'true';
  if (!devSkip) {
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) return forbidden('missing Cf-Access-Jwt-Assertion');
    try {
      const payload = await verifyAccessJwt(jwt, env);
      if ((payload.email || '').toLowerCase() !== email) return forbidden('JWT email does not match header');
    } catch (e) {
      return forbidden(`invalid Access JWT: ${e.message}`);
    }
  }
  return { email };
}

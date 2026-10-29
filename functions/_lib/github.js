// Minimal GitHub REST client for the admin API (contents endpoints only).
export const repoOf = (env) => env.GITHUB_REPO || 'jvaidya-personal/website';
export const branchOf = (env) => env.GITHUB_BRANCH || 'main';

export const COLLECTIONS = {
  recipes: 'src/content/recipes',
  blog: 'src/content/blog',
  images: 'public/images',
};

// Only these paths may be read or written through the admin.
export function allowedPath(p) {
  if (typeof p !== 'string' || p.includes('..') || p.startsWith('/')) return false;
  return /^src\/content\/(recipes|blog)\/[a-z0-9][a-z0-9._-]*\.md$/.test(p) ||
    /^public\/images\/[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|gif|webp|svg|avif)$/.test(p);
}

export async function gh(env, path, init = {}) {
  if (!env.GITHUB_TOKEN) throw new HttpError(500, 'GITHUB_TOKEN is not configured');
  const res = await fetch(`${env.GITHUB_API_BASE || 'https://api.github.com'}/repos/${repoOf(env)}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'jitendravaidya-admin',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new HttpError(res.status === 404 ? 404 : res.status === 409 ? 409 : 502, `GitHub ${res.status}: ${data?.message || text}`);
  return data;
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const b64encodeUtf8 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
export const b64decodeUtf8 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

export async function putFile(env, path, base64, sha, email) {
  const file = path.split('/').pop();
  return gh(env, `/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Edit ${file} via admin (${email})`,
      content: base64,
      branch: branchOf(env),
      ...(sha ? { sha } : {}),
      committer: { name: 'jitendravaidya.com admin', email: 'admin@jitendravaidya.com' },
      author: { name: email, email },
    }),
  });
}

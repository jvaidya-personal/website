import { allowedPath, json, putFile, HttpError } from '../../_lib/github.js';

// POST /api/admin/upload { name, base64 } -> commits public/images/<name>; returns its public URL.
export async function onRequestPost({ request, env, data }) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+/, '');
  const stamped = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}-${name}`;
  const path = `public/images/${stamped}`;
  if (!allowedPath(path) || typeof body?.base64 !== 'string') throw new HttpError(400, 'need { name, base64 } with an image extension');
  if (body.base64.length > 8_000_000) throw new HttpError(413, 'image too large (max ~6 MB)');
  const r = await putFile(env, path, body.base64, undefined, data.email);
  return json({ path, url: `/images/${stamped}`, commit: r.commit.sha });
}

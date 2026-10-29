import { allowedPath, gh, json, branchOf, putFile, b64encodeUtf8, b64decodeUtf8, HttpError } from '../../_lib/github.js';

// GET /api/admin/file?path=src/content/blog/hello.md -> { path, sha, content }
export async function onRequestGet({ request, env }) {
  const path = new URL(request.url).searchParams.get('path');
  if (!allowedPath(path) || !path.endsWith('.md')) throw new HttpError(400, 'path not allowed');
  const f = await gh(env, `/contents/${path}?ref=${encodeURIComponent(branchOf(env))}`);
  return json({ path, sha: f.sha, content: b64decodeUtf8(f.content) });
}

// PUT /api/admin/file { path, content, sha? } -> commits the file to the repo.
// Pass the sha you loaded to update (GitHub rejects stale shas with 409); omit it to create.
export async function onRequestPut({ request, env, data }) {
  const body = await request.json().catch(() => null);
  if (!body || !allowedPath(body.path) || !body.path.endsWith('.md') || typeof body.content !== 'string') throw new HttpError(400, 'need { path, content }');
  if (body.content.length > 500_000) throw new HttpError(413, 'file too large');
  const r = await putFile(env, body.path, b64encodeUtf8(body.content), body.sha, data.email);
  return json({ path: body.path, sha: r.content.sha, commit: r.commit.sha });
}

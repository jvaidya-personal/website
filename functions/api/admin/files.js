import { COLLECTIONS, gh, json, branchOf, HttpError } from '../../_lib/github.js';

// GET /api/admin/files?collection=recipes|blog|images -> [{ name, path, sha, size }]
export async function onRequestGet({ request, env }) {
  const collection = new URL(request.url).searchParams.get('collection') || 'recipes';
  const dir = COLLECTIONS[collection];
  if (!dir) throw new HttpError(400, 'unknown collection');
  let items = [];
  try {
    items = await gh(env, `/contents/${dir}?ref=${encodeURIComponent(branchOf(env))}`);
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const files = items
    .filter((f) => f.type === 'file' && f.name !== '.gitkeep')
    .map(({ name, path, sha, size }) => ({ name, path, sha, size }));
  return json({ collection, files });
}

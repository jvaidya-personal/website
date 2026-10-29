import { authorize, } from '../../_lib/access.js';
import { HttpError, json } from '../../_lib/github.js';

// Every /api/admin/* request must carry an allowed Cloudflare Access identity.
export async function onRequest(ctx) {
  const auth = await authorize(ctx.request, ctx.env);
  if (auth instanceof Response) return auth;
  ctx.data.email = auth.email;
  try {
    return await ctx.next();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    return json({ error: String(e?.message || e) }, 500);
  }
}

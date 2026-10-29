# Deploying jitendravaidya.com on Cloudflare Pages

The site is static Astro output (`dist/`) plus Pages Functions in `functions/`
(the admin API at `/api/admin/*`). Cloudflare builds and deploys every push to
`main`, including commits the admin editor makes, so publishing = saving.

## 1. Create the Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorise the Cloudflare GitHub app for the `jvaidya-personal` org, **only** for the
   repository `jvaidya-personal/website`.
3. Settings:
   | Setting | Value |
   |---|---|
   | Project name | `jitendravaidya` |
   | Production branch | `main` |
   | Framework preset | Astro |
   | Build command | `pnpm build` |
   | Build output directory | `dist` |
   | Root directory | *(empty)* |
4. **Environment variables (Production *and* Preview)** — Settings → Variables and Secrets:
   | Name | Type | Value |
   |---|---|---|
   | `NODE_VERSION` | Plain text | `22` |
   | `ADMIN_EMAILS` | Plain text | `jitendra.vaidya@gmail.com,alicia.woodrow@gmail.com` |
   | `CF_ACCESS_TEAM_DOMAIN` | Plain text | `<team>.cloudflareaccess.com` (step 3) |
   | `CF_ACCESS_AUD` | Plain text | the Access application's **Application Audience (AUD) tag** (step 3) |
   | `GITHUB_TOKEN` | **Secret** (Encrypt) | fine-grained token from step 2 |
   | `GITHUB_REPO` | Plain text (optional) | `jvaidya-personal/website` (default) |
   | `GITHUB_BRANCH` | Plain text (optional) | `main` (default) |

   pnpm is picked up automatically from `packageManager` in `package.json`
   (if the build ever fails to find pnpm, also add `PNPM_VERSION` = `10.33.4`).

   **Never** set `DEV_SKIP_ACCESS_JWT` or `GITHUB_API_BASE` in Cloudflare — they exist only
   for local testing.
5. Save and **Retry deployment** so the variables take effect. The site is then live at
   `https://jitendravaidya.pages.dev`.

## 2. Fine-grained GitHub token (only this repo, contents read/write)

1. Signed in as `jvaidya`: GitHub → Settings → Developer settings → **Personal access tokens →
   Fine-grained tokens** → **Generate new token**.
2. Token name `jitendravaidya.com admin`; expiration e.g. 1 year (set a calendar reminder to rotate).
3. **Resource owner:** `jvaidya-personal`. (If the org requires approval for fine-grained
   tokens, approve it under the org's Settings → Personal access tokens → Pending requests.)
4. **Repository access:** *Only select repositories* → `jvaidya-personal/website`.
5. **Permissions → Repository permissions:** `Contents` = **Read and write**
   (`Metadata` = Read-only is added automatically). Nothing else.
6. Generate, copy, and paste into the Pages secret `GITHUB_TOKEN` (Production and Preview).
   Don't store it anywhere else.

## 3. Cloudflare Access (Google sign-in) for the admin

1. Zero Trust dashboard (first time: pick a team name → this gives
   `<team>.cloudflareaccess.com`; the Free plan covers up to 50 users).
2. **Settings → Authentication → Login methods → Add new → Google.** Follow the on-screen
   steps: in Google Cloud Console create an OAuth client (type *Web application*) with
   authorised JavaScript origin `https://<team>.cloudflareaccess.com` and redirect URI
   `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`; paste the Client ID and
   secret into Cloudflare and click **Test**.
3. **Access → Applications → Add an application → Self-hosted.**
   - Name: `jitendravaidya.com admin`; session duration 24 h.
   - Public hostnames (add each):
     - `jitendravaidya.com` path `admin*`
     - `jitendravaidya.com` path `api/admin*`
     - optionally also `www.jitendravaidya.com` and `jitendravaidya.pages.dev` with the same two paths
       (and `*.jitendravaidya.pages.dev` for preview deployments).
   - Identity providers: **Google** only; enable *Instant Auth* to skip the chooser.
   - Policy: name `Admins`, action **Allow**, include → **Emails** →
     `jitendra.vaidya@gmail.com`, `alicia.woodrow@gmail.com`.
4. After saving, open the application → **Overview** and copy the **Application Audience (AUD)
   Tag** into the Pages variable `CF_ACCESS_AUD`; set `CF_ACCESS_TEAM_DOMAIN` to
   `<team>.cloudflareaccess.com`. Redeploy.

The Functions check, on every `/api/admin/*` request, that `Cf-Access-Authenticated-User-Email`
is present and listed in `ADMIN_EMAILS`, **and** that `Cf-Access-Jwt-Assertion` is a valid RS256
JWT signed by `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` with `aud` =
`CF_ACCESS_AUD`, not expired, for the same email. Anything else → `403`. If the Access env vars
are missing the API fails closed (403).

To add or remove an editor, change **both** the Access policy and `ADMIN_EMAILS`.

## 4. Custom domain and DNS move to Cloudflare

jitendravaidya.com is currently registered via Google Domains (now Squarespace Domains).

1. Cloudflare dashboard → **Add a domain** → `jitendravaidya.com` → Free plan. Cloudflare scans
   the existing records — compare them with the Squarespace DNS page and add anything missing
   (especially **MX/TXT records for email**, SPF/DKIM, Google site verification).
2. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`).
3. Squarespace Domains → `jitendravaidya.com` → **DNS → Domain nameservers → Use custom
   nameservers** → enter the two Cloudflare nameservers, save. **Turn DNSSEC off at Squarespace
   first** (re-enable it later from Cloudflare → DNS → Settings, adding the DS record at
   Squarespace).
4. Wait for the zone to become **Active** in Cloudflare (minutes to a few hours).
5. Pages project → **Custom domains → Set up a custom domain** → `jitendravaidya.com`, then again
   for `www.jitendravaidya.com`. Cloudflare creates the CNAME records and certificates.
6. Optional: a redirect rule `www.jitendravaidya.com/*` → `https://jitendravaidya.com/${1}` (301).
7. (Optional, later) transfer the registration itself to Cloudflare Registrar.
8. When jitendravaidya.com is live, retire the Carrd site (jitenvaidya.carrd.co) and update any
   links to `jvaidya-personal.github.io/recipes` (old recipe slugs are kept, now under `/recipes/<slug>`).

## 5. Check it works

- `https://jitendravaidya.com/`, `/recipes`, `/blog`, `/rss.xml` load.
- In a private window, `https://jitendravaidya.com/admin` → Google sign-in → editor lists files.
- `curl -i https://jitendravaidya.com/api/admin/files` → redirected to Access / `403`.
- Edit a post in the admin → a commit `Edit <file> via admin (<email>)` appears on `main` → a new
  deployment starts → the change is live in ~1–2 minutes.

## Local development

```sh
pnpm install
pnpm dev                 # site at http://localhost:4321 (admin API not available here)
pnpm build && pnpm test  # build + Access JWT unit tests

# admin API locally, without GitHub or Access:
node scripts/mock-github.mjs 18790 &
printf 'GITHUB_TOKEN=dummy\nDEV_SKIP_ACCESS_JWT=1\nGITHUB_API_BASE=http://127.0.0.1:18790\n' > .dev.vars
npx wrangler@4 pages dev dist
curl -H 'Cf-Access-Authenticated-User-Email: jitendra.vaidya@gmail.com' localhost:8788/api/admin/files?collection=blog
```

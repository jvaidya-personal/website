# jitendravaidya.com

Jiten Vaidya's personal site: Astro (static) + Tailwind, hosted on Cloudflare Pages.

- `/` — home (bio, from the old jitenvaidya.carrd.co)
- `/recipes` — 42 family recipes, `src/content/recipes/*.md` (migrated from `jvaidya-personal/recipes` with `scripts/migrate-recipes.mjs`)
- `/blog` — posts in `src/content/blog/*.md`, tags, `/rss.xml`. Facebook reposts: `source: facebook`, `originalDate`, optional `originalUrl`.
- `/admin` — small editor that commits to this repo through Pages Functions in `functions/api/admin/*` (GitHub REST API, `GITHUB_TOKEN` secret), behind Cloudflare Access + JWT checks.

See [DEPLOY.md](DEPLOY.md) for setup.

## Content format

Recipe frontmatter: `title`, `slug`, `categories`, `comingSoon`, `ingredients` (list of sections `{ title, items: [{ amount, measure, ingredient, comment }] }`), `steps` (list), optional `notes`. Any Markdown body is shown under the recipe.

Blog frontmatter: `title`, `date`, `description`, `tags`, `draft`, optional `source: facebook`, `originalDate`, `originalUrl`.

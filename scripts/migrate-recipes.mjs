// One-off migration: jvaidya-personal/recipes content/recipes/recipe-NN.json -> src/content/recipes/*.md
// Usage: node scripts/migrate-recipes.mjs <path-to-recipes-repo>
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const src = process.argv[2] || '../jvp-recipes';
const CATS = [
  ['Dal', ['dal']], ['Chai', ['chai']], ['Chicken', ['chicken']], ['Vegan', ['vegan']],
  ['Sauces/Chutneys', ['sauce', 'chutney']],
  ['Desserts', ['cake', 'flan', 'frosting', 'icing', 'ice cream']],
];
const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const categories = (t) => {
  t = t.toLowerCase();
  const c = CATS.filter(([, kws]) => kws.some((k) => new RegExp(`\\b${esc(k)}\\b`).test(t))).map(([n]) => n);
  return c.length ? c : ['Other'];
};
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const dir = path.join(src, 'content/recipes');
const out = 'src/content/recipes';
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  // same slug scheme as the old site (build.py) so old links map 1:1
  const slug = `${String(r.id).padStart(2, '0')}-${slugify(r.title)}`;
  const sections = [];
  let cur = null;
  for (const i of r.ingredients || []) {
    if ('section' in i) { cur = { title: i.section, items: [] }; sections.push(cur); continue; }
    if (!cur) { cur = { title: null, items: [] }; sections.push(cur); }
    cur.items.push({ amount: i.amount ?? null, measure: i.measure ?? null, ingredient: i.ingredient ?? null, comment: i.comment ?? null });
  }
  const fm = { title: r.title, slug, id: r.id, categories: categories(r.title), comingSoon: !!r.coming_soon, ingredients: sections, steps: r.steps || [] };
  if (r.notes) fm.notes = r.notes;
  const body = `---\n${YAML.stringify(fm, { lineWidth: 0 })}---\n`;
  fs.writeFileSync(path.join(out, `${slug}.md`), body);
}
console.log('migrated', fs.readdirSync(out).length);

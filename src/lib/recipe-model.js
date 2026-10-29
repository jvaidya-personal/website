// Pure (DOM-free) helpers for the admin editor, shared with the node tests.
// Goal: loading and saving a file without edits reproduces it byte for byte.
import YAML from 'yaml';

export const INGREDIENT_FIELDS = ['amount', 'measure', 'ingredient', 'comment'];
// Measures offered by the old 2017 editor (jvaidya/recipes edit.html); free text is still allowed.
export const MEASURES = ['t.', 'T.', 'Cup', 'Count', 'Gallon', 'Gram', 'Inch', 'Ounce', 'Pieces', 'Pinch', 'Pint', 'Pound', 'Square Inch'];

export function parseDoc(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { fm: YAML.parse(m[1]) || {}, body: m[2] } : { fm: {}, body: text };
}
export const serializeDoc = (fm, body) =>
  `---\n${YAML.stringify(fm, { lineWidth: 0 })}---\n${body ? (body.startsWith('\n') ? body : '\n' + body) : ''}`;

const str = (v) => (v === null || v === undefined ? '' : String(v));
// Keep the original value when the user did not change what was shown for it.
export function cellValue(orig, raw) {
  if (raw === str(orig)) return orig === undefined ? null : orig;
  return raw.trim() === '' ? null : raw;
}

// ingredients (sections) -> flat rows
export function ingredientsToRows(sections = []) {
  const rows = [];
  sections.forEach((s, si) => {
    if (s.title !== null && s.title !== undefined || si > 0) rows.push({ type: 'section', title: str(s.title), orig: s });
    for (const it of s.items || []) rows.push({ type: 'item', ...Object.fromEntries(INGREDIENT_FIELDS.map((f) => [f, str(it[f])])), orig: it });
  });
  return rows;
}

// flat rows -> ingredients (sections)
export function rowsToIngredients(rows) {
  const out = [];
  let cur = null;
  for (const r of rows) {
    if (r.type === 'section') {
      const o = r.orig || {};
      cur = { ...o, title: cellValue(o.title, r.title), items: [] };
      out.push(cur);
    } else {
      if (!cur) { cur = { title: null, items: [] }; out.push(cur); }
      const o = r.orig || {};
      const it = { ...o };
      for (const f of INGREDIENT_FIELDS) it[f] = cellValue(o[f], r[f]);
      if (r.orig || INGREDIENT_FIELDS.some((f) => it[f] !== null)) cur.items.push(it);
    }
  }
  return out;
}

export const stepsToRows = (steps = []) => steps.map((s) => ({ text: str(s), orig: s }));
export const rowsToSteps = (rows) =>
  rows.map((r) => (r.text === str(r.orig) ? r.orig : r.text.trim())).filter((s) => s !== '' && s !== null && s !== undefined);

// Simple frontmatter fields shown as inputs.
export const listDisplay = (v) => (Array.isArray(v) ? v.join(', ') : str(v));
export function fieldValue(orig, raw, type) {
  if (type === 'bool') return raw === 'true';
  if (type === 'list') return raw === listDisplay(orig) ? orig : raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (type === 'date') {
    const shown = orig instanceof Date ? orig.toISOString().slice(0, 10) : str(orig).slice(0, 10);
    return raw === shown ? orig : raw.trim() || undefined;
  }
  return raw === str(orig) ? orig : raw.trim() || undefined;
}

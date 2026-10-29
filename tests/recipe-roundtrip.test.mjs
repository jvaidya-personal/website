// Loading and saving every recipe through the editor model, with no edits, must be byte-identical.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseDoc, serializeDoc, ingredientsToRows, rowsToIngredients, stepsToRows, rowsToSteps, fieldValue, listDisplay } from '../src/lib/recipe-model.js';

const dir = new URL('../src/content/recipes/', import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

test('there are 42 recipes', () => assert.equal(files.length, 42));

for (const f of files) {
  test(`round-trip ${f}`, () => {
    const text = fs.readFileSync(new URL(f, dir), 'utf8');
    const { fm, body } = parseDoc(text);
    // simulate what the form shows and reads back
    const out = { ...fm };
    out.title = fieldValue(fm.title, String(fm.title ?? ''), 'text');
    out.slug = fieldValue(fm.slug, String(fm.slug ?? ''), 'text');
    out.categories = fieldValue(fm.categories, listDisplay(fm.categories), 'list');
    out.comingSoon = fieldValue(fm.comingSoon, fm.comingSoon ? 'true' : 'false', 'bool');
    out.ingredients = rowsToIngredients(ingredientsToRows(fm.ingredients).map((r) => ({ ...r })));
    out.steps = rowsToSteps(stepsToRows(fm.steps));
    assert.equal(serializeDoc(out, body.replace(/^\n/, '')), text);
  });
}

test('edits are applied', () => {
  const rows = ingredientsToRows([{ title: null, items: [{ amount: '1', measure: 'Cup', ingredient: 'rice', comment: null }] }]);
  rows[0].comment = 'washed';
  rows.push({ type: 'section', title: 'For the tadka' }, { type: 'item', amount: '2', measure: 't.', ingredient: 'ghee', comment: '' });
  assert.deepEqual(rowsToIngredients(rows), [
    { title: null, items: [{ amount: '1', measure: 'Cup', ingredient: 'rice', comment: 'washed' }] },
    { title: 'For the tadka', items: [{ amount: '2', measure: 't.', ingredient: 'ghee', comment: null }] },
  ]);
  assert.deepEqual(rowsToSteps([{ text: ' Boil. ' }, { text: '' }, { text: 'Serve', orig: 'Serve' }]), ['Boil.', 'Serve']);
});

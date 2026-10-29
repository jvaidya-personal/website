// DOM row editors for recipe ingredients and steps (admin only).
// Ingredient rows mirror the 2017 Tornado editor columns: amount, measure, ingredient, comment.
import { MEASURES } from './recipe-model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const COLS = [
  ['amount', 'Quantity'],
  ['measure', 'Measure'],
  ['ingredient', 'Item'],
  ['comment', 'Comment'],
];

function makeDraggable(container, rows, rerender, onChange) {
  let from = null;
  container.querySelectorAll('[data-i]').forEach((el) => {
    const handle = el.querySelector('.drag');
    handle.addEventListener('mousedown', () => (el.draggable = true));
    el.addEventListener('dragstart', (e) => { from = +el.dataset.i; e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.draggable = false; el.classList.remove('dragging'); });
    el.addEventListener('dragover', (e) => { if (from !== null) { e.preventDefault(); el.classList.add('dropover'); } });
    el.addEventListener('dragleave', () => el.classList.remove('dropover'));
    el.addEventListener('drop', (e) => {
      e.preventDefault(); el.classList.remove('dropover');
      const to = +el.dataset.i;
      if (from === null || from === to) return;
      const [r] = rows.splice(from, 1); rows.splice(to, 0, r); from = null;
      rerender(); onChange();
    });
  });
}

const actions = (extra = '') => `
  <div class="acts">
    <button type="button" tabindex="-1" data-act="up" title="Move up" aria-label="Move up">↑</button>
    <button type="button" tabindex="-1" data-act="down" title="Move down" aria-label="Move down">↓</button>
    ${extra}
    <button type="button" tabindex="-1" data-act="del" title="Delete" aria-label="Delete" class="del">✕</button>
  </div>`;

export function ingredientEditor(container, rows, onChange) {
  { const f = container.cloneNode(false); container.replaceWith(f); container = f; } // drop listeners from a previous file
  const listId = 'measures-list';
  function render(focus) {
    let n = 0;
    container.innerHTML = `
      <datalist id="${listId}">${MEASURES.map((m) => `<option value="${esc(m)}"></option>`).join('')}</datalist>
      <div class="ing-head" aria-hidden="true"><span></span><span>#</span>${COLS.map(([, l]) => `<span>${l}</span>`).join('')}<span></span></div>
      ${rows.map((r, i) => r.type === 'section'
        ? `<div class="row sec" data-i="${i}">
             <span class="drag" title="Drag to reorder">⋮⋮</span>
             <input class="cell sec-title" data-f="title" value="${esc(r.title)}" placeholder="Section heading, e.g. For the tadka" aria-label="Section heading" />
             ${actions('<button type="button" tabindex="-1" data-act="add" title="Add ingredient below" aria-label="Add ingredient below">＋</button>')}
           </div>`
        : `<div class="row ing" data-i="${i}">
             <span class="drag" title="Drag to reorder">⋮⋮</span>
             <span class="num">${++n}</span>
             ${COLS.map(([f, l]) => `<label class="c-${f}"><span class="lbl">${l}</span><input class="cell" data-f="${f}" value="${esc(r[f])}" ${f === 'measure' ? `list="${listId}"` : ''} aria-label="${l}" /></label>`).join('')}
             ${actions('<button type="button" tabindex="-1" data-act="add" title="Add row below" aria-label="Add row below">＋</button>')}
           </div>`).join('')}
      <div class="row-btns">
        <button type="button" data-act="add-end">+ Ingredient</button>
        <button type="button" data-act="add-sec">+ Section</button>
      </div>`;
    makeDraggable(container, rows, () => render(), onChange);
    if (focus) {
      const el = container.querySelector(`[data-i="${focus.i}"] .cell${focus.f ? `[data-f="${focus.f}"]` : ''}`);
      el?.focus();
    }
  }
  const blank = () => ({ type: 'item', amount: '', measure: '', ingredient: '', comment: '' });
  const insert = (at, row, f) => { rows.splice(at, 0, row); render({ i: at, f }); onChange(); };

  container.addEventListener('input', (e) => {
    const el = e.target.closest('.cell'); if (!el) return;
    rows[+el.closest('[data-i]').dataset.i][el.dataset.f] = el.value; onChange();
  });
  container.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'add-end') return insert(rows.length, blank(), 'amount');
    if (act === 'add-sec') return insert(rows.length, { type: 'section', title: '' }, 'title');
    const i = +b.closest('[data-i]').dataset.i;
    if (act === 'add') return insert(i + 1, blank(), 'amount');
    if (act === 'del') {
      const r = rows[i];
      const label = r.type === 'section' ? `section "${r.title || '(untitled)'}"` : `"${r.ingredient || 'this row'}"`;
      if ((r.title || r.ingredient || r.amount) && !confirm(`Delete ${label}?`)) return;
      rows.splice(i, 1); render({ i: Math.min(i, rows.length - 1) }); return onChange();
    }
    const j = act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]]; render({ i: j }); onChange();
  });
  container.addEventListener('keydown', (e) => {
    const el = e.target.closest('.cell');
    if (!el || e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    const cells = [...container.querySelectorAll('.cell')];
    const idx = cells.indexOf(el);
    const i = +el.closest('[data-i]').dataset.i;
    const lastInRow = el.dataset.f === 'comment' || el.dataset.f === 'title';
    if (e.shiftKey) return cells[idx - 1]?.focus();
    if (lastInRow && (i === rows.length - 1 || el.dataset.f === 'comment')) {
      // Enter in the last cell adds a new ingredient row right below
      if (el.dataset.f === 'comment' || i === rows.length - 1) return insert(i + 1, blank(), 'amount');
    }
    (cells[idx + 1] || cells[idx]).focus();
  });
  render();
  return { render };
}

export function stepsEditor(container, rows, onChange) {
  { const f = container.cloneNode(false); container.replaceWith(f); container = f; } // drop listeners from a previous file
  const autosize = (t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; };
  function render(focus) {
    container.innerHTML = rows.map((r, i) => `
      <div class="row step" data-i="${i}">
        <span class="drag" title="Drag to reorder">⋮⋮</span>
        <span class="num">${i + 1}</span>
        <textarea class="cell" data-f="text" rows="2" aria-label="Step ${i + 1}">${esc(r.text)}</textarea>
        ${actions('<button type="button" tabindex="-1" data-act="add" title="Add step below" aria-label="Add step below">＋</button>')}
      </div>`).join('') + `<div class="row-btns"><button type="button" data-act="add-end">+ Step</button><span class="hint">Ctrl/⌘+Enter adds a step below</span></div>`;
    container.querySelectorAll('textarea').forEach(autosize);
    makeDraggable(container, rows, () => render(), onChange);
    if (focus) container.querySelector(`[data-i="${focus.i}"] textarea`)?.focus();
  }
  const insert = (at) => { rows.splice(at, 0, { text: '' }); render({ i: at }); onChange(); };
  container.addEventListener('input', (e) => {
    const t = e.target.closest('textarea'); if (!t) return;
    rows[+t.closest('[data-i]').dataset.i].text = t.value; autosize(t); onChange();
  });
  container.addEventListener('keydown', (e) => {
    const t = e.target.closest('textarea');
    if (t && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); insert(+t.closest('[data-i]').dataset.i + 1); }
  });
  container.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    if (b.dataset.act === 'add-end') return insert(rows.length);
    const i = +b.closest('[data-i]').dataset.i;
    if (b.dataset.act === 'add') return insert(i + 1);
    if (b.dataset.act === 'del') {
      if (rows[i].text.trim() && !confirm(`Delete step ${i + 1}?`)) return;
      rows.splice(i, 1); render({ i: Math.min(i, rows.length - 1) }); return onChange();
    }
    const j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]]; render({ i: j }); onChange();
  });
  render();
}

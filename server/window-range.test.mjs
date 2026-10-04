import test from 'node:test';
import assert from 'node:assert/strict';
import { rowOffsets, rowAt, windowSlots } from '../src/app/window-range.js';
import { partitionThemes, combineThemeRules, cssRules } from '../scripts/theme-packs.mjs';

test('windowing retains total geometry and a focused row without rendering skipped rows', () => {
  const items = Array.from({ length: 5000 }, (_, i) => ({ hash: String(i) }));
  const offsets = rowOffsets(items, new Map(), 40);
  const slots = windowSlots(offsets, 100000, 600, 0);
  assert.ok(slots.filter(slot => slot.type === 'row').length < 40);
  assert.ok(slots.some(slot => slot.index === 0));
  assert.equal(slots.reduce((sum, slot) => sum + (slot.type === 'spacer' ? slot.height : 40), 0), 200000);
  assert.equal(rowAt(offsets, 200000), 4999);
  assert.deepEqual(windowSlots(new Float64Array([0]), 0, 600), []);
});

test('variable mobile heights and shortened feeds preserve valid ranges and stripe parity', () => {
  const items = [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }];
  const offsets = rowOffsets(items, new Map([['b', 180]]), 120);
  assert.deepEqual([...offsets], [0, 120, 300, 420]);
  assert.equal(rowAt(offsets, 150), 1);
  const slots = windowSlots(offsets, 5000, 844, 9999, 0);
  assert.deepEqual(slots.filter(slot => slot.type === 'row').map(slot => slot.index), [2]);
  assert.equal(slots[0].parity, 0);
});

test('theme splitting retains cascade order across media rules, grouped selectors and negation', () => {
  const css = ':root{--color:black}@media(min-width:1px){:root[data-theme=dark]{--color:white}.shared{color:var(--color)}:root:is([data-theme=dark],[data-theme=light]) .x{border:0}}:root[data-theme=light]{--color:red}:root:not([data-theme=dark]) .y{opacity:.5}.theme-preview.dark{background:url("thumb.webp")}';
  const { shared, packs, gallery } = partitionThemes(css, ['dark', 'light']);
  const dark = combineThemeRules(shared, packs.dark);
  assert.ok(dark.indexOf('--color:white') < dark.indexOf('.shared'));
  assert.ok(!dark.includes('--color:red'));
  assert.ok(dark.includes(':root:not([data-theme=dark])'));
  assert.equal(gallery.length, 1);
  assert.ok(!dark.includes('thumb.webp'));
});

test('CSS splitting respects quoted braces, URLs, comments and nested conditions', () => {
  const css = '.x{content:"}";background:url("data:image/svg+xml,{x}")}@supports(display:grid){@media(min-width:1px){.y{content:";{"}}}';
  assert.equal(cssRules(css).length, 2);
  const split = partitionThemes(css, ['dark']);
  assert.ok(combineThemeRules(split.shared).includes('@supports(display:grid){@media(min-width:1px){.y'));
  assert.throws(() => cssRules('.x{color:red'), /Unbalanced/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitColumnWidths } from '../src/app/fit-column-widths.js';
test('column preferences fit any pane, including stale oversized saved widths', () => {
  for (const space of [0, 280, 640, 1024, 2560]) {
    const fitted = fitColumnWidths([9000, 70, 180, 300], space);
    assert.ok(Math.abs(fitted.reduce((a,b) => a+b,0)-space)<1e-6);
    assert.ok(fitted.every(width => width >= 0));
  }
  assert.deepEqual(fitColumnWidths([NaN,-10], 100), [50,50]);
});

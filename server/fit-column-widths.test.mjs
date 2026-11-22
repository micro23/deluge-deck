import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnWidthFloors, fitColumnWidths, resizeColumnWidths } from '../src/app/fit-column-widths.js';
test('column preferences fit any pane, including stale oversized saved widths', () => {
  for (const space of [0, 280, 640, 1024, 2560]) {
    const fitted = fitColumnWidths([9000, 70, 180, 300], space);
    assert.ok(Math.abs(fitted.reduce((a,b) => a+b,0)-space)<1e-6);
    assert.ok(fitted.every(width => width >= 0));
  }
  assert.deepEqual(fitColumnWidths([NaN,-10], 100), [50,50]);
});

test('resizing a fitted column moves its divider while preserving other minimums', () => {
  const floors = [100, 60, 40];
  const widths = [180, 60, 60];
  assert.deepEqual(resizeColumnWidths(widths, floors, 1, 95), [153.75, 95, 51.25]);
  assert.deepEqual(resizeColumnWidths(widths, floors, 1, 250), [100, 160, 40]);
  assert.deepEqual(resizeColumnWidths([300], [100], 0, 250), [300]);
});

test('fitted columns still resize when the pane equals the sum of their ideal minimums', () => {
  const minimums = [110, 100, 90];
  const fitted = fitColumnWidths(minimums, 300, minimums);
  const floors = columnWidthFloors(minimums, 300);
  assert.ok(300 - floors.reduce((sum, width) => sum + width, 0) >= 24);
  const wider = resizeColumnWidths(fitted, floors, 1, fitted[1] + 12);
  assert.equal(wider[1], fitted[1] + 12);
  assert.ok(wider.every((width, index) => width >= floors[index] - .0001));
  assert.deepEqual(fitColumnWidths(wider, 300, minimums).map(Math.round), wider.map(Math.round));
  const narrowerFloors = columnWidthFloors(minimums, 299);
  assert.ok(floors.every((width, index) => width - narrowerFloors[index] < 1));
});

test('narrow saved columns yield to readable widths before distributing remaining space', () => {
  assert.deepEqual(fitColumnWidths([800, 24, 24], 400, [120, 90, 60]), [250, 90, 60]);
  assert.deepEqual(fitColumnWidths([240, 100, 60], 400, [120, 90, 60]), [240, 100, 60]);
  const empty = fitColumnWidths([800, 24, 24], 0, [120, 90, 60]);
  assert.deepEqual(empty, [0, 0, 0]);
  const tight = fitColumnWidths([800, 24, 24], 240, [120, 90, 60]);
  assert.equal(Math.round(tight.reduce((sum, width) => sum + width, 0)), 240);
  assert.ok(tight[1] >= 73 && tight[2] >= 49, 'a cramped pane still reserves room for both undersized columns');
});

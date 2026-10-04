export function rowOffsets(items, heights, estimate) {
  const offsets = new Float64Array(items.length + 1);
  for (let i = 0; i < items.length; i++) offsets[i + 1] = offsets[i] + (heights.get(items[i].hash) || estimate);
  return offsets;
}
export function rowAt(offsets, position) {
  let low = 0, high = offsets.length - 1;
  while (low < high) { const middle = Math.floor((low + high + 1) / 2); if (offsets[middle] <= position) low = middle; else high = middle - 1; }
  return Math.min(low, Math.max(0, offsets.length - 2));
}
export function windowSlots(offsets, top, height, focused = null, overscan = 8) {
  const count = offsets.length - 1;
  if (!count) return [];
  const start = Math.max(0, rowAt(offsets, Math.max(0, top)) - overscan);
  const end = Math.min(count, rowAt(offsets, Math.max(0, top) + height) + overscan + 1);
  const indices = Array.from({ length: end - start }, (_, i) => start + i);
  if (Number.isInteger(focused) && focused >= 0 && focused < count && !indices.includes(focused)) indices.push(focused);
  indices.sort((a, b) => a - b);
  const slots = []; let previous = 0;
  for (const index of indices) {
    if (index > previous) slots.push({ type: 'spacer', key: `gap-${previous}`, height: offsets[index] - offsets[previous], parity: (index - previous) % 2 });
    slots.push({ type: 'row', key: index, index }); previous = index + 1;
  }
  if (previous < count) slots.push({ type: 'spacer', key: `gap-${previous}`, height: offsets[count] - offsets[previous], parity: (count - previous) % 2 });
  return slots;
}

export function columnWidthFloors(minimums, space) {
  const minimumTotal = minimums.reduce((sum, width) => sum + width, 0);
  // Keep a resize budget even when the pane is exactly wide enough for the
  // comfortable floors. Scaling continuously also avoids a jump at that width.
  const floorScale = minimumTotal > 0 ? Math.min(1, space * .92 / minimumTotal) : 1;
  return minimums.map(width => width * floorScale);
}

export function fitColumnWidths(preferred, available, minimums = []) {
  const space = Math.max(0, available);
  const floors = columnWidthFloors(preferred.map((_, index) => minimums[index] || 0), space);
  return distributeWidths(preferred, space, floors);
}

function distributeWidths(preferred, space, floors) {
  const weights = preferred.map(width => Number.isFinite(width) && width > 0 ? width : 80);
  let remaining = space;
  let totalWeight = weights.reduce((sum, width) => sum + width, 0);
  const widths = Array(weights.length).fill(null);
  // Fix the tightest columns at their floors first. Healthy proportions are
  // preserved when they already fit, including when a user resizes a column.
  const order = weights.map((_, index) => index).sort((a, b) => floors[b] / weights[b] - floors[a] / weights[a]);
  for (const index of order) {
    if (remaining * weights[index] / totalWeight >= floors[index]) break;
    widths[index] = floors[index];
    remaining -= floors[index];
    totalWeight -= weights[index];
  }
  return widths.map((width, index) => width ?? remaining * weights[index] / totalWeight);
}

export function resizeColumnWidths(widths, floors, index, requested) {
  if (widths.length <= 1) return widths;
  const space = widths.reduce((sum, width) => sum + width, 0);
  const otherFloors = floors.filter((_, position) => position !== index);
  const maxWidth = space - otherFloors.reduce((sum, width) => sum + width, 0);
  const width = Math.max(floors[index], Math.min(maxWidth, requested));
  const next = distributeWidths(widths.filter((_, position) => position !== index), space - width, otherFloors);
  next.splice(index, 0, width);
  return next;
}

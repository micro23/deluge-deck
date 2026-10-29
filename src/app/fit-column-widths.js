// Keep the same proportional fitting policy as Torrent-Deck's table directive.
export function fitColumnWidths(preferred, available) {
  const weights = preferred.map(width => Number.isFinite(width) && width > 0 ? width : 80);
  const total = weights.reduce((sum, width) => sum + width, 0);
  return weights.map(width => total ? Math.max(0, available) * width / total : 0);
}

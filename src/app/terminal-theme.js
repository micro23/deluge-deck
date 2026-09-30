// Terminal's compact console geometry and persisted layout belong to this theme.
// Shared table settings and the other palettes never read or write these keys.
export const terminalColumnWidths = {
  name: 300, state: 78, progress: 120, size: 62, ratio: 48,
  download: 68, upload: 68, eta: 36, seeds: 58, peers: 58,
  added: 100, seedingTime: 104, tracker: 128, queue: 50,
};
export const terminalColumnLabels = { name: 'Name', download: 'DL', upload: 'UL' };
export const tableStorageKey = (theme, setting) =>
  theme === 'terminal' ? `deck-terminal-column-${setting}` : `deck-column-${setting}`;

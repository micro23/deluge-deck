import { SPORTS_CLUBS, SPORTS_GROUPS } from './sports-clubs.js';

export const THEMES = [
  ['dark', 'Midnight', 'Ink black, glacier cyan, and cool moonlight.', '🌙'],
  ['darkhand', 'Darkhand', 'Low-glare charcoal cards, Deluge blue, and live transfer history.', '💧'],
  ['light', 'Paper', 'Crisp white, slate ink, and editorial teal.', '📝'],
  ['ocean', 'Ocean', 'Abyssal navy, clear aqua, and sea-glass light.', '🌊'],
  ['forest', 'Forest', 'Pine ink, moss layers, and warm parchment.', '🌲'],
  ['sunset', 'Sunset', 'Twilight blue, coral light, and soft gold.', '🌅'],
  ['christmas', 'Christmas', 'Evergreen, cranberry, snow, and gold.', '🎄'],
  ['halloween', 'Halloween', 'Strict black and harvest-orange contrast.', '🎃'],
  ['valentine', 'Valentine’s', 'Rose paper, berry ink, and plum detail.', '💗'],
  ['st-patricks', 'St. Patrick’s', 'Clover, heritage green, and cream.', '☘️'],
  ['independence', 'Independence', 'Midnight navy, signal red, and star blue.', '⭐'],
  ['new-year', 'New Year', 'Midnight black, champagne, and warm gold.', '✨'],
  ['terminal', 'Terminal', 'A high-contrast operator console in pure black, white, and hard-edged mono.', '📟'],
  ...Object.entries(SPORTS_CLUBS).map(([id, club]) => [id, club.label, club.description, { Baseball: '⚾', Basketball: '🏀', Football: '🏈', Hockey: '🏒' }[club.sport]]),
];

export const THEME_CATEGORIES = [
  { id: 'regular', label: 'Regular themes', themes: ['dark', 'darkhand', 'light', 'ocean', 'forest', 'sunset', 'terminal'] },
  { id: 'holiday', label: 'Holiday themes', themes: ['christmas', 'halloween', 'valentine', 'st-patricks', 'independence', 'new-year'] },
  { id: 'sports', label: 'Sports themes', themes: SPORTS_GROUPS.flatMap(group => group.themes), groups: SPORTS_GROUPS },
];

export const THEME_ORDER = THEME_CATEGORIES.flatMap(category => category.themes);

export const REFRESH_OPTIONS = [
  [1500, 'Every 1.5 seconds'],
  [3000, 'Every 3 seconds'],
  [5000, 'Every 5 seconds'],
  [10000, 'Every 10 seconds'],
];

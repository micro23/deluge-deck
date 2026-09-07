export function contrastRatio(foreground, background) {
  const rgb = (value) => value.match(/[a-f\d]{2}/gi).map((part) => Number.parseInt(part, 16) / 255);
  const luminance = (value) => rgb(value).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const [first, second] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (first + .05) / (second + .05);
}

export function themeAccentPairs(css) {
  const pairs = [];
  const blocks = css.matchAll(/:root(?:\[data-theme="([^"]+)"\])?\s*\{([^}]*)\}/g);
  for (const [, theme = 'dark', declarations] of blocks) {
    const cyan = declarations.match(/--cyan:(#[a-f\d]{6})/i)?.[1];
    const foreground = declarations.match(/--accent-fg:(#[a-f\d]{6})/i)?.[1];
    if (cyan || foreground) pairs.push({ theme, cyan, foreground });
  }
  return pairs;
}

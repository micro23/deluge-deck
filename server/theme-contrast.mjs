export function contrastRatio(foreground, background) {
  const rgb = (value) => value.match(/[a-f\d]{2}/gi).map((part) => Number.parseInt(part, 16) / 255);
  const luminance = (value) => rgb(value).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const [first, second] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (first + .05) / (second + .05);
}

export function themeAccentPairs(css) {
  return themePalettes(css).map(({ theme, cyan, accentFg }) => ({ theme, cyan, foreground: accentFg }));
}

export function themePalettes(css) {
  const palettes = [];
  const blocks = css.matchAll(/:root(?:\[data-theme="([^"]+)"\])?\s*\{([^}]*)\}/g);
  for (const [, theme = 'dark', declarations] of blocks) {
    const values = Object.fromEntries([...declarations.matchAll(/--([a-z\d-]+):(#[a-f\d]{6})(?:;|\s)/gi)].map(([, key, value]) => [key, value]));
    if (!values.bg) continue;
    palettes.push({
      theme,
      bg: values.bg,
      surface: values.surface,
      surface2: values['surface-2'],
      surface3: values['surface-3'],
      lineStrong: values['line-strong'],
      text: values.text,
      muted: values.muted,
      muted2: values['muted-2'],
      cyan: values.cyan,
      accentFg: values['accent-fg'],
      violet: values.violet,
      amber: values.amber,
      green: values.green,
      danger: values.danger,
    });
  }
  // The stylesheet intentionally has layered art-direction blocks. Evaluate
  // the final declaration for each theme, matching the browser cascade, rather
  // than treating later visual overrides as additional palettes.
  return [...new Map(palettes.map((palette) => [palette.theme, palette])).values()];
}

// Split leaf rules while retaining their exact cascade position. Shared rules
// are stored once; theme packs contain only scoped rules and theme-only fonts.
export function cssRules(css) {
  const rules = [];
  let start = 0, quote = '', comment = false, depth = 0, parens = 0, opening = -1;
  for (let i = 0; i < css.length; i++) {
    const c = css[i], next = css[i + 1];
    if (comment) { if (c === '*' && next === '/') { comment = false; i++; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '/' && next === '*') { comment = true; i++; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '\\') { i++; continue; }
    if (c === '(') parens++;
    if (c === ')') parens--;
    if (parens) continue;
    if (c === '{') { if (depth++ === 0) opening = i; }
    if (c === '}' && --depth === 0) {
      const prelude = css.slice(start, opening).trim().replace(/^(?:\/\*[\s\S]*?\*\/\s*)+/, '');
      rules.push({ prelude, body: css.slice(opening + 1, i), css: css.slice(start, i + 1).trim() });
      start = i + 1;
    } else if (c === ';' && depth === 0) {
      rules.push({ prelude: css.slice(start, i + 1).trim(), css: css.slice(start, i + 1).trim() });
      start = i + 1;
    }
  }
  if (depth || quote || comment || parens) throw new Error('Unbalanced CSS while creating theme packs');
  if (css.slice(start).trim()) rules.push({ prelude: css.slice(start).trim(), css: css.slice(start).trim() });
  return rules;
}

function splitSelectors(selector) {
  const result = []; let start = 0, depth = 0, quote = '';
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && !depth) { result.push(selector.slice(start, i)); start = i + 1; }
  }
  result.push(selector.slice(start)); return result;
}

export function partitionThemes(css, themes) {
  const shared = [], gallery = [], packs = Object.fromEntries(themes.map(theme => [theme, []]));
  let order = 0;
  const visit = (source, wrappers = []) => {
    for (const rule of cssRules(source)) {
      if (/^@(media|supports|container|layer|document)\b/i.test(rule.prelude) && rule.body != null) {
        visit(rule.body, [...wrappers, rule.prelude]); continue;
      }
      let text = rule.css;
      for (const wrapper of [...wrappers].reverse()) text = `${wrapper}{${text}}`;
      const entry = [order++, text];
      if (/\.theme-preview\.[\w-]+/.test(rule.prelude) && /url\(/.test(rule.body || '')) { gallery.push(entry); continue; }
      if (/^@font-face/i.test(rule.prelude)) {
        const theme = /Deck (?:Inter|JB Mono)|Deck(?:Inter|JBMono)/i.test(rule.body) ? 'darkhand' : /Deck CRT|DeckCRT/i.test(rule.body) ? 'terminal' : null;
        (theme && packs[theme] ? packs[theme] : shared).push(entry); continue;
      }
      if (rule.prelude.startsWith('@')) { shared.push(entry); continue; }
      const matches = new Set(); let generic = false;
      for (const selector of splitSelectors(rule.prelude)) {
        // Negated theme selectors can apply to every other theme. Keep those
        // conservative rather than guessing whether a selector will match.
        if (/:not\([^)]*data-theme/.test(selector)) { generic = true; break; }
        const names = [...selector.matchAll(/\[data-theme\s*=\s*["']?([\w-]+)["']?\s*\]/g)].map(match => match[1]);
        if (!names.length) { generic = true; break; }
        names.forEach(name => matches.add(name));
      }
      if (generic || !matches.size) shared.push(entry);
      else for (const name of matches) {
        if (!packs[name]) throw new Error(`Unknown CSS theme: ${name}`);
        packs[name].push(entry);
      }
    }
  };
  visit(css);
  return { shared, gallery, packs };
}

export const themeAssetTokens = css => css.replace(/url\((["']?)(?:\/assets\/)([^)'"\s]+)\1\)/g, (_, quote, file) => `url("__DECK_ASSET__/${file}")`);
export const combineThemeRules = (...groups) => groups.flat().sort((a, b) => a[0] - b[0]).map(row => row[1]).join('');

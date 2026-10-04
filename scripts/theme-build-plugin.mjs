import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { THEMES } from '../src/app/themes.js';
import { partitionThemes, combineThemeRules, themeAssetTokens } from './theme-packs.mjs';

const ids = THEMES.map(([id]) => id);
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 12);
export function themeBuildPlugin() {
  return {
    name: 'deck-theme-packs',
    enforce: 'post',
    generateBundle(_, bundle) {
      const cssAsset = Object.values(bundle).find(file => file.type === 'asset' && file.fileName.endsWith('.css'));
      if (!cssAsset) throw new Error('Missing compiled Deck stylesheet');
      const original = String(cssAsset.source);
      const { shared, packs, gallery } = partitionThemes(themeAssetTokens(original), ids);
      const themes = {};
      for (const [theme, rows] of Object.entries(packs)) {
        const source = JSON.stringify(rows);
        const fileName = `themes/${theme}-${hash(source)}.json`;
        this.emitFile({ type: 'asset', fileName, source }); themes[theme] = fileName;
      }
      const gallerySource = JSON.stringify(gallery);
      const galleryFile = `themes/gallery-${hash(gallerySource)}.json`;
      this.emitFile({ type: 'asset', fileName: galleryFile, source: gallerySource });
      this.emitFile({ type: 'asset', fileName: 'deck-themes.json', source: JSON.stringify({ version: 1, shared, themes, gallery: galleryFile }) });
      // The initial CSS contains only shared rules; complete ordered rules are
      // assembled once the selected theme arrives. External assets stay lazy.
      cssAsset.source = combineThemeRules(partitionThemes(original, ids).shared);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/deck-themes.json' && !/^\/themes\/[\w-]+\.json$/.test(req.url || '')) return next();
        try {
          const main = await readFile(path.join(server.config.root, 'src/main.jsx'), 'utf8');
          const imports = [...main.matchAll(/import ['"]([^'"]+\.css)['"];?/g)].map(match => path.resolve(server.config.root, 'src', match[1]));
          const sources = await Promise.all(imports.map(async file => (await readFile(file, 'utf8')).replace(/url\((["']?)([^)'"\s]+)\1\)/g, (match, quote, url) => {
            if (/^(?:data:|https?:|\/|#)/.test(url)) return match;
            return `url("/${path.relative(server.config.root, path.resolve(path.dirname(file), url)).replaceAll('\\', '/')}")`;
          })));
          const { shared, packs, gallery } = partitionThemes(sources.join('\n'), ids);
          const payload = req.url === '/deck-themes.json' ? { version: 1, shared, themes: Object.fromEntries(ids.map(id => [id, `themes/${id}.json`])), gallery: 'themes/gallery.json' } : req.url === '/themes/gallery.json' ? gallery : packs[path.basename(req.url, '.json')];
          if (!payload) { res.statusCode = 404; res.end(); return; }
          res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(payload));
        } catch (error) { next(error); }
      });
    },
  };
}

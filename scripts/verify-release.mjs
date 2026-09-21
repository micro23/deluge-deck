import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const setup = await readFile(path.join(root, 'plugin/setup.py'), 'utf8');
const init = await readFile(path.join(root, 'plugin/deluge_deck/__init__.py'), 'utf8');
const version = packageJson.version;

if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid release version: ${version}`);
if (!setup.includes("json.loads((ROOT.parent / 'package.json').read_text())['version']"))
  throw new Error('plugin/setup.py is not using package.json as its version source.');
if (/__version__\s*=\s*['"]\d+\.\d+\.\d+['"]/.test(init))
  throw new Error('plugin runtime contains a hard-coded release version.');

const dataDir = path.join(root, 'plugin/deluge_deck/data');
const files = await readdir(dataDir);
const versioned = files.filter((file) => file.startsWith(`deluge-deck-${version}`));
if (versioned.length < 3)
  throw new Error(`Generated plugin resources for ${version} are missing; run npm run build:plugin.`);

console.log(`Release metadata OK: ${version}`);

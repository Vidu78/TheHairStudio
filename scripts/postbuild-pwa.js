// Post-build: sostituisce __CACHE_VERSION__ in dist/sw.js con un timestamp
// del deploy. Garantisce che ogni build generi un nome cache nuovo,
// forzando la pulizia delle vecchie versioni nell'activate handler.
const fs   = require('fs');
const path = require('path');

const SW_PATH = path.resolve(__dirname, '..', 'dist', 'sw.js');

if (!fs.existsSync(SW_PATH)) {
  console.error('[postbuild-pwa] dist/sw.js non trovato. Esegui prima `expo export`.');
  process.exit(1);
}

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
  : Date.now().toString();

let sw = fs.readFileSync(SW_PATH, 'utf8');
const replaced = sw.replace(/__CACHE_VERSION__/g, VERSION);

if (replaced === sw) {
  console.warn('[postbuild-pwa] Token __CACHE_VERSION__ non trovato in sw.js (forse gia\' sostituito).');
} else {
  fs.writeFileSync(SW_PATH, replaced, 'utf8');
  console.log(`[postbuild-pwa] CACHE_VERSION = ${VERSION}`);
}

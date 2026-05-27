// Genera le icone PWA da assets/images/icona app.png
// - logo192.png         : 192x192, cover completa
// - logo512.png         : 512x512, cover completa
// - logo512-maskable.png: 512x512 con 80% area sicura + bg #0A0A0A (safe zone Android)
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT      = path.resolve(__dirname, '..');
const SRC_ICON  = path.join(ROOT, 'assets', 'images', 'icona app.png');
const OUT_DIR   = path.join(ROOT, 'public');
const BG_COLOR  = { r: 10, g: 10, b: 10, alpha: 1 }; // #0A0A0A

if (!fs.existsSync(SRC_ICON)) {
  console.error('Icona sorgente non trovata:', SRC_ICON);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  // 192 cover
  await sharp(SRC_ICON)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(OUT_DIR, 'logo192.png'));

  // 512 cover
  await sharp(SRC_ICON)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(OUT_DIR, 'logo512.png'));

  // 512 maskable: contenuto 80% centrato su bg pieno (safe zone Android 80%)
  const INNER = 410; // ~80% di 512
  const innerBuf = await sharp(SRC_ICON)
    .resize(INNER, INNER, { fit: 'contain', background: BG_COLOR })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width:  512,
      height: 512,
      channels: 4,
      background: BG_COLOR,
    }
  })
    .composite([{ input: innerBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'logo512-maskable.png'));

  console.log('Icone PWA generate in', OUT_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });

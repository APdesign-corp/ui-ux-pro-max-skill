// Génère le calque PNG transparent du filigrane MAQUETTE (même dessin que dans le moteur),
// pour l'appliquer par ffmpeg sur une vidéo déjà rendue :  node scripts/make_watermark.mjs 1080 1920 out/wm.png
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';
const [W, H, OUT] = [Number(process.argv[2] || 1080), Number(process.argv[3] || 1920), process.argv[4] || 'out/wm.png'];
const EXEC = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const server = await startServer(0);
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const page = await b.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?w=${W}&h=${H}`);
const data = await page.evaluate(async ([w, h]) => {
  for (const wt of [600, 700, 800, 900]) {
    const f = new FontFace('Poppins', `url(node_modules/@fontsource/poppins/files/poppins-latin-${wt}-normal.woff2)`, { weight: String(wt) });
    await f.load(); document.fonts.add(f);
  }
  const { drawWatermark } = await import('/src/world/brand.js');
  const { CONFIG } = await import('/src/config.js');
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  drawWatermark(c.getContext('2d'), w, h, { ...CONFIG.watermark, enabled: true }, null);
  return c.toDataURL('image/png');
}, [W, H]);
fs.writeFileSync(OUT, Buffer.from(data.split(',')[1], 'base64'));
await b.close(); server.close();
console.log('filigrane ->', path.resolve(OUT));

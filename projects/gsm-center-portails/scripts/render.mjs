// Export vidéo image par image : Chromium headless (WebGL) → PNG → ffmpeg (H.264 / ProRes)
// + bande-son générée (scripts/sound_design.py) synchronisée sur la timeline.
//
//   node scripts/render.mjs                               16:9 1920×1080, 60 i/s, MP4 + audio
//   node scripts/render.mjs --format 9x16                 vertical 1080×1920 (Reels / TikTok / Shorts)
//   node scripts/render.mjs --width 3840 --height 2160    4K
//   node scripts/render.mjs --still 2.6,5,8.6 --format 9x16 --width 540 --height 960 --stills-dir out/stills
//   options : --fps 60|30  --workers 2  --from 0 --to 30  --vfx 1  --no-audio  --keep-frames

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};
const format = opt('format', '16x9');
const W = Number(opt('width', format === '9x16' ? 1080 : 1920));
const H = Number(opt('height', format === '9x16' ? 1920 : 1080));
const fps = Number(opt('fps', 60));
const workers = Number(opt('workers', 2));
const vfx = opt('vfx', null);
const still = opt('still', null);
const out = path.resolve(ROOT, opt('out', `out/gsm-center-portails-${format}-${W}x${H}-${fps}fps.mp4`));
const framesDir = path.resolve(ROOT, opt('frames-dir', `out/frames-${format}-${W}x${H}`));

const EXEC = process.env.CHROMIUM_PATH ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));

const server = await startServer(0);
const port = server.address().port;
const qs = new URLSearchParams({ render: '1', w: W, h: H, fps, format });
if (vfx) qs.set('vfx', vfx);
for (const k of ['bloom', 'dof', 'msaa', 'particles', 'hide']) if (opt(k, null) !== null) qs.set(k, opt(k));
const URL_ = `http://127.0.0.1:${port}/index.html?${qs}`;

async function openPage() {
  const browser = await chromium.launch({
    executablePath: EXEC,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
      '--force-device-scale-factor=1', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.goto(URL_);
  await page.waitForFunction(() => window.__adReady === true, null, { timeout: 180000 });
  const cdp = await page.context().newCDPSession(page);
  const grab = async (t) => {
    await page.evaluate((tt) => window.__ad.renderFrame(tt), t);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', optimizeForSpeed: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
    });
    return Buffer.from(data, 'base64');
  };
  const info = await page.evaluate(() => ({ duration: window.__ad.duration, clock: window.__ad.clock }));
  return { browser, page, grab, info };
}

const t0 = Date.now();
if (still) {
  const p = await openPage();
  const sdir = path.resolve(ROOT, opt('stills-dir', 'out/stills'));
  fs.mkdirSync(sdir, { recursive: true });
  for (const t of String(still).split(',').map(Number)) {
    const file = path.join(sdir, `${format}-${t.toFixed(2)}s.png`);
    fs.writeFileSync(file, await p.grab(t));
    console.log('→', path.relative(ROOT, file));
  }
  await p.browser.close();
  server.close();
  process.exit(0);
}

const probe = await openPage();
// Export des cues (bruitages synchronisés) pour scripts/sound_design.py
const cueInfo = await probe.page.evaluate(() => ({ duration: window.__ad.duration, segments: window.__ad.segments, cues: window.__ad.cues }));
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out', 'cues.json'), JSON.stringify(cueInfo, null, 1));
if (args.includes('--cues-only')) { await probe.browser.close(); server.close(); console.log('→ out/cues.json'); process.exit(0); }
const duration = Number(opt('to', probe.info.duration));
const from = Number(opt('from', 0));
const total = Math.round((duration - from) * fps);
await probe.browser.close();
console.log(`Rendu ${W}×${H} @ ${fps} i/s — ${total} images (${from}→${duration} s), ${workers} worker(s)`);
fs.mkdirSync(framesDir, { recursive: true });

let done = 0;
const pending = [];
for (let i = 0; i < total; i++) {
  if (!fs.existsSync(path.join(framesDir, `f_${String(i).padStart(5, '0')}.png`))) pending.push(i);
}
done = total - pending.length;
if (done) console.log(`  reprise : ${done} images déjà présentes`);
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(workers, pending.length || 1) }, async () => {
    if (!pending.length) return;
    const p = await openPage();
    while (next < pending.length) {
      const i = pending[next++];
      const buf = await p.grab(from + i / fps);
      fs.writeFileSync(path.join(framesDir, `f_${String(i).padStart(5, '0')}.png`), buf);
      done++;
      if (done % 10 === 0 || done === total) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`  ${done}/${total}  ${(el / done).toFixed(2)} s/img  ETA ${Math.round((el / done) * (total - done))} s\n`);
      }
    }
    await p.browser.close();
  }),
);
server.close();

// ---------- audio
let audio = null;
if (!args.includes('--no-audio')) {
  audio = path.join(ROOT, 'out', 'gsm-center-portails-sound.wav');
  const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'sound_design.py'), '--out', audio, '--duration', String(duration), '--cues', path.join(ROOT, 'out', 'cues.json')], { stdio: 'inherit' });
  if (r.status !== 0) audio = null;
}

// ---------- encodage
fs.mkdirSync(path.dirname(out), { recursive: true });
const ff = ['-y', '-hide_banner', '-loglevel', 'warning', '-stats', '-framerate', String(fps), '-i', path.join(framesDir, 'f_%05d.png')];
if (audio) ff.push('-i', audio);
if (args.includes('--prores')) {
  ff.push('-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le');
  if (audio) ff.push('-c:a', 'pcm_s24le');
  ff.push(out.replace(/\.mp4$/, '.mov'));
} else {
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-x264-params', 'aq-mode=3', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709');
  if (audio) ff.push('-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000');
  ff.push('-shortest', '-movflags', '+faststart', out);
}
await new Promise((res, rej) => {
  const p = spawn('ffmpeg', ff, { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('exit', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
});
if (!args.includes('--keep-frames')) fs.rmSync(framesDir, { recursive: true, force: true });
console.log(`✓ ${path.relative(ROOT, out)}  (${((Date.now() - t0) / 60000).toFixed(1)} min)`);

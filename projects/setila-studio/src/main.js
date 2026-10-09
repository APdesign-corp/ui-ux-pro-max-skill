// SETÍLA STUDIO — publicité motion design verticale 1080×1920, 30 i/s.
// Rendu Canvas 2D déterministe : renderFrame(t) dessine l'image à l'instant t (s).
// Personnes : photos réelles affichées INTACTES (mise à l'échelle uniforme uniquement, aucune déformation).
// Affiches : jamais affichées, leurs textes sont recréés typographiquement (aucune personne).

const W = 1080, H = 1920;
const SAFE = { t: 250, b: H - 450, l: 70, r: W - 70 };
const C = {
  ivory: '#f8f2e9', cream: '#efe4d5', powder: '#e7d5c3', nude: '#d6b79c', champagne: '#cdb48c',
  gold: '#b8935b', goldL: '#dcc391', choc: '#4a3326', chocD: '#2b1d15', ink: '#16110e', text: '#3b2a20',
};
const F = {
  logo: '"Italiana", "Cormorant Garamond", serif',
  serif: '"Cormorant Garamond", serif',
  script: '"Great Vibes", cursive',
  sans: '"Montserrat", "Noto Color Emoji", sans-serif',
};

// ------------------------------------------------------------------ utilitaires
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: (x) => 1 - Math.pow(1 - x, 3), inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), back: (x) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2),
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
};
const win = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? E.out(seg(t, a, b)) : t <= c ? 1 : 1 - E.inOut(seg(t, c, d)));
function rng(s) { return () => { s = (s + 0x6d2b79f5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function font(g, size, fam, weight = 400, style = '', track = 0) {
  g.font = `${style} ${weight} ${size}px ${fam}`.trim();
  g.letterSpacing = `${track}px`;
}
function wrap(g, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const w of para.split(' ')) {
      const test = line ? line + ' ' + w : w;
      if (line && g.measureText(test).width > maxW) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  return out;
}

// ------------------------------------------------------------------ ressources
const IMG_NAMES = ['formatrice', 'cils-cateyes-1', 'cils-cateyes-2', 'cils-wispy-brun', 'cils-mapping', 'cils-freckles',
  'cils-yeux-verts', 'cils-yeux-bruns', 'rehaussement-regard', 'rehaussement-yeux-verts', 'rehaussement-reaction',
  'browlift-mapping', 'sourcils-browlift', 'browlift-produits', 'strass-1', 'strass-2', 'papouilles-ambiance'];
const IMG = {};
async function loadAll() {
  const faces = [
    ['Italiana', 'italiana', 400, 'normal'],
    ...[300, 400, 500, 600].map((w) => ['Cormorant Garamond', 'cormorant-garamond', w, 'normal']),
    ...[300, 400, 500].map((w) => ['Cormorant Garamond', 'cormorant-garamond', w, 'italic']),
    ['Great Vibes', 'great-vibes', 400, 'normal'],
    ...[300, 400, 500, 600].map((w) => ['Montserrat', 'montserrat', w, 'normal']),
  ].map(([fam, pkg, w, st]) => new FontFace(fam, `url(node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-${st}.woff2)`, { weight: String(w), style: st }));
  await Promise.all(faces.map(async (f) => { await f.load(); document.fonts.add(f); }));
  await Promise.all(IMG_NAMES.map((n) => new Promise((res) => { const i = new Image(); i.onload = res; i.onerror = res; i.src = `assets/img/${n}.jpg`; IMG[n] = i; })));
  await document.fonts.ready;
}

// ------------------------------------------------------------------ textures pré-calculées
let GRAIN, DUST;
function prepare() {
  GRAIN = document.createElement('canvas'); GRAIN.width = 512; GRAIN.height = 512;
  const g = GRAIN.getContext('2d'); const d = g.createImageData(512, 512); const r = rng(7);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - 0.5) * 60; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; }
  g.putImageData(d, 0, 0);
  const r2 = rng(11);
  DUST = Array.from({ length: 70 }, () => ({ x: r2(), y: r2(), s: 1 + r2() * 2.6, sp: 0.2 + r2() * 0.8, ph: r2() * 6.28, dr: (r2() - 0.5) * 0.02 }));
}

// ------------------------------------------------------------------ décor
function background(g, t, mode = 'ivory') {
  const dark = mode === 'choc';
  const lg = g.createLinearGradient(0, 0, W * 0.3, H);
  if (dark) { lg.addColorStop(0, '#3a281e'); lg.addColorStop(1, '#1f1510'); }
  else { lg.addColorStop(0, C.ivory); lg.addColorStop(0.55, '#f3e9dc'); lg.addColorStop(1, C.powder); }
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  // lumières douces qui dérivent
  const blobs = [[0.2, 0.18, 0.55], [0.85, 0.5, 0.5], [0.3, 0.85, 0.6]];
  blobs.forEach(([x, y, r], i) => {
    const bx = (x + 0.04 * Math.sin(t * 0.25 + i * 2)) * W, by = (y + 0.03 * Math.cos(t * 0.2 + i)) * H;
    const rg = g.createRadialGradient(bx, by, 0, bx, by, r * W);
    rg.addColorStop(0, dark ? 'rgba(205,180,140,0.16)' : 'rgba(255,250,242,0.75)');
    rg.addColorStop(1, 'rgba(255,250,242,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  });
}
function dust(g, t, k = 1, color = C.goldL) {
  if (k <= 0) return;
  g.save();
  for (const p of DUST) {
    const y = ((p.y - t * p.sp * 0.03) % 1 + 1) % 1, x = p.x + Math.sin(t * 0.5 + p.ph) * 0.01;
    const a = k * (0.25 + 0.55 * Math.max(0, Math.sin(t * 1.3 + p.ph)));
    g.fillStyle = rgba(color, a);
    g.beginPath(); g.arc(x * W, y * H, p.s, 0, 6.283); g.fill();
  }
  g.restore();
}
function finish(g, t, dark = false) {
  // vignette + grain
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(10,6,4,0.55)' : 'rgba(90,60,40,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function grain(g, t) {
  g.save(); g.globalCompositeOperation = 'overlay';
  const ox = Math.floor((t * 97) % 512), oy = Math.floor((t * 61) % 512);
  for (let x = -ox; x < W; x += 512) for (let y = -oy; y < H; y += 512) g.drawImage(GRAIN, x, y);
  g.restore();
}
function goldLine(g, x, y, w, p, center = true, color = C.gold, thick = 2) {
  if (p <= 0) return;
  const len = w * E.inOut(p);
  const x0 = center ? x - len / 2 : x;
  const lg = g.createLinearGradient(x0, 0, x0 + len, 0);
  lg.addColorStop(0, rgba(color, 0)); lg.addColorStop(0.5, rgba(color, 1)); lg.addColorStop(1, rgba(color, 0));
  g.fillStyle = lg; g.fillRect(x0, y - thick / 2, len, thick);
}
function sparkle(g, x, y, s, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.globalAlpha = a;
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, s * 3);
  rg.addColorStop(0, 'rgba(255,246,220,0.9)'); rg.addColorStop(1, 'rgba(255,246,220,0)');
  g.fillStyle = rg; g.fillRect(-s * 3, -s * 3, s * 6, s * 6);
  g.fillStyle = '#fff7e0';
  g.beginPath(); g.moveTo(0, -s * 2.4); g.quadraticCurveTo(0, 0, s * 2.4, 0); g.quadraticCurveTo(0, 0, 0, s * 2.4); g.quadraticCurveTo(0, 0, -s * 2.4, 0); g.quadraticCurveTo(0, 0, 0, -s * 2.4); g.fill();
  g.restore();
}

// texte centré avec révélation par masque + légère montée
function revealText(g, str, x, y, size, fam, p, o = {}) {
  if (p <= 0) return;
  font(g, size, fam, o.weight || 400, o.style || '', o.track || 0);
  g.textAlign = o.align || 'center'; g.textBaseline = 'alphabetic';
  const w = g.measureText(str).width;
  const x0 = g.textAlign === 'center' ? x - w / 2 : g.textAlign === 'right' ? x - w : x;
  g.save();
  g.globalAlpha = (o.alpha ?? 1) * clamp(p * 1.4);
  if (o.mask !== false) { g.beginPath(); g.rect(x0 - 40, y - size * 1.3, (w + 80) * E.out(p), size * 1.9); g.clip(); }
  g.fillStyle = o.color || C.text;
  g.fillText(str, x, y + (1 - E.out(p)) * size * 0.25);
  if (o.foil) foilPass(g, str, x0, w, x, y + (1 - E.out(p)) * size * 0.25, size, p);
  g.restore();
  return w;
}
// balayage lumineux doré sur un texte déjà posé (même police / alignement courants)
function foilPass(g, str, x0, w, dx, y, size, p, period = 3.2) {
  const T = (window.__t || 0) * 1;
  const ph = ((T / period) % 1) * 1.6 - 0.3;
  const cx = x0 + w * ph;
  const lg = g.createLinearGradient(cx - size * 1.4, y - size, cx + size * 1.4, y);
  lg.addColorStop(0, 'rgba(255,236,190,0)'); lg.addColorStop(0.5, `rgba(255,236,190,${0.85 * clamp(p)})`); lg.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = lg; g.fillText(str, dx, y);
}
// lettres une à une (fondu + resserrement)
function lettersIn(g, str, x, y, size, fam, t, o = {}) {
  font(g, size, fam, o.weight || 400, '', 0);
  const tr = lerp(o.trackFrom ?? size * 0.5, o.track ?? size * 0.12, E.out(seg(t, 0, o.dur ?? 1.6)));
  const ws = [...str].map((c) => g.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + tr * (ws.length - 1);
  let cx = x - total / 2;
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  [...str].forEach((ch, i) => {
    const k = E.out(seg(t, i * (o.stagger ?? 0.07), i * (o.stagger ?? 0.07) + 0.8));
    g.globalAlpha = k * (o.alpha ?? 1);
    g.fillStyle = o.color || C.ink;
    g.fillText(ch, cx, y + (1 - k) * size * 0.18);
    if (o.foil) foilPass(g, ch, x - total / 2, total, cx, y + (1 - k) * size * 0.18, size, k);
    cx += ws[i] + tr;
  });
  g.restore();
  return total;
}

// photo dans un cadre : mise à l'échelle UNIFORME (cover) + léger travelling, coins arrondis, filet doré, ombre
function photoFrame(g, img, x, y, w, h, o = {}) {
  if (!img || !img.width || (o.alpha ?? 1) <= 0) return;
  const a = o.alpha ?? 1;
  g.save(); g.globalAlpha = a;
  // ombre douce
  g.save(); g.shadowColor = 'rgba(60,35,20,0.28)'; g.shadowBlur = 50; g.shadowOffsetY = 22;
  g.fillStyle = '#efe5d8'; roundRect(g, x, y, w, h, o.r ?? 26); g.fill(); g.restore();
  g.save(); roundRect(g, x, y, w, h, o.r ?? 26); g.clip();
  const zoom = o.zoom ?? 1;
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s, dh = img.height * s;
  const fx = o.fx ?? 0.5, fy = o.fy ?? 0.5;
  const px = x + (w - dw) * fx + (o.panX || 0), py = y + (h - dh) * fy + (o.panY || 0);
  g.drawImage(img, px, py, dw, dh);
  g.restore();
  g.strokeStyle = rgba(C.goldL, 0.9 * a); g.lineWidth = 2; roundRect(g, x + 8, y + 8, w - 16, h - 16, Math.max(4, (o.r ?? 26) - 8)); g.stroke();
  g.restore();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// petit titre de section : surtitre espacé + titre serif + filet doré
function sectionTitle(g, lt, kicker, title, y, dark = false, sub) {
  const col = dark ? C.goldL : C.gold;
  revealText(g, kicker, W / 2, y, 30, F.sans, seg(lt, 0.1, 0.8), { weight: 500, track: 9, color: col });
  revealText(g, title, W / 2, y + 92, 82, F.serif, seg(lt, 0.25, 1.1), { weight: 500, color: dark ? C.ivory : C.ink, foil: true });
  goldLine(g, W / 2, y + 130, 420, seg(lt, 0.5, 1.4), true, col);
  if (sub) revealText(g, sub, W / 2, y + 196, 46, F.serif, seg(lt, 0.7, 1.5), { style: 'italic', color: dark ? C.cream : C.choc });
}

// ------------------------------------------------------------------ icônes (traits fins)
function icon(g, kind, x, y, s, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(0, 0, s, 0, 6.283); g.stroke();
  g.beginPath();
  const k = s / 40;
  if (kind === 'cap') { g.moveTo(-20 * k, -4 * k); g.lineTo(0, -14 * k); g.lineTo(20 * k, -4 * k); g.lineTo(0, 6 * k); g.closePath(); g.moveTo(-12 * k, 1 * k); g.lineTo(-12 * k, 12 * k); g.quadraticCurveTo(0, 20 * k, 12 * k, 12 * k); g.lineTo(12 * k, 1 * k); }
  else if (kind === 'user') { g.arc(0, -8 * k, 8 * k, 0, 6.283); g.moveTo(-15 * k, 16 * k); g.quadraticCurveTo(0, -2 * k, 15 * k, 16 * k); }
  else if (kind === 'eye') { g.moveTo(-18 * k, 0); g.quadraticCurveTo(0, -16 * k, 18 * k, 0); g.quadraticCurveTo(0, 16 * k, -18 * k, 0); g.moveTo(7 * k, 0); g.arc(0, 0, 7 * k, 0, 6.283); for (let i = -2; i <= 2; i++) { g.moveTo(i * 7 * k, -9 * k); g.lineTo(i * 9 * k, -16 * k); } }
  else if (kind === 'brow') { g.moveTo(-18 * k, 4 * k); g.quadraticCurveTo(0, -14 * k, 18 * k, -2 * k); g.moveTo(-14 * k, 12 * k); g.quadraticCurveTo(2 * k, -2 * k, 16 * k, 8 * k); }
  else if (kind === 'phone') { g.roundRect(-10 * k, -17 * k, 20 * k, 34 * k, 4 * k); g.moveTo(-3 * k, 12 * k); g.lineTo(3 * k, 12 * k); }
  else if (kind === 'tooth') { g.moveTo(-14 * k, -10 * k); g.quadraticCurveTo(-14 * k, -18 * k, -5 * k, -16 * k); g.quadraticCurveTo(0, -13 * k, 5 * k, -16 * k); g.quadraticCurveTo(14 * k, -18 * k, 14 * k, -10 * k); g.quadraticCurveTo(14 * k, 2 * k, 9 * k, 16 * k); g.quadraticCurveTo(5 * k, 18 * k, 3 * k, 6 * k); g.quadraticCurveTo(0, 2 * k, -3 * k, 6 * k); g.quadraticCurveTo(-5 * k, 18 * k, -9 * k, 16 * k); g.quadraticCurveTo(-14 * k, 2 * k, -14 * k, -10 * k); }
  else if (kind === 'star') { for (let i = 0; i < 10; i++) { const r = (i % 2 ? 7 : 17) * k, a = -Math.PI / 2 + i * Math.PI / 5; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
  else if (kind === 'crown') { g.moveTo(-18 * k, 10 * k); g.lineTo(-18 * k, -8 * k); g.lineTo(-8 * k, 2 * k); g.lineTo(0, -14 * k); g.lineTo(8 * k, 2 * k); g.lineTo(18 * k, -8 * k); g.lineTo(18 * k, 10 * k); g.closePath(); }
  else if (kind === 'diamond') { g.moveTo(-16 * k, -4 * k); g.lineTo(-8 * k, -14 * k); g.lineTo(8 * k, -14 * k); g.lineTo(16 * k, -4 * k); g.lineTo(0, 16 * k); g.closePath(); g.moveTo(-16 * k, -4 * k); g.lineTo(16 * k, -4 * k); }
  else if (kind === 'lotus') { g.moveTo(0, 12 * k); g.quadraticCurveTo(-8 * k, 0, 0, -14 * k); g.quadraticCurveTo(8 * k, 0, 0, 12 * k); g.moveTo(0, 12 * k); g.quadraticCurveTo(-18 * k, 6 * k, -16 * k, -6 * k); g.quadraticCurveTo(-6 * k, -2 * k, 0, 12 * k); g.moveTo(0, 12 * k); g.quadraticCurveTo(18 * k, 6 * k, 16 * k, -6 * k); g.quadraticCurveTo(6 * k, -2 * k, 0, 12 * k); }
  g.stroke(); g.restore();
}
// logo Instagram (glyphe officiel : carré arrondi, objectif, point) en dégradé de marque
function instagramLogo(g, x, y, s) {
  g.save(); g.translate(x, y);
  const lg = g.createLinearGradient(-s / 2, s / 2, s / 2, -s / 2);
  lg.addColorStop(0, '#feda75'); lg.addColorStop(0.25, '#fa7e1e'); lg.addColorStop(0.5, '#d62976'); lg.addColorStop(0.75, '#962fbf'); lg.addColorStop(1, '#4f5bd5');
  g.fillStyle = lg; roundRect(g, -s / 2, -s / 2, s, s, s * 0.28); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = s * 0.085;
  roundRect(g, -s * 0.3, -s * 0.3, s * 0.6, s * 0.6, s * 0.17); g.stroke();
  g.beginPath(); g.arc(0, 0, s * 0.14, 0, 6.283); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.19, -s * 0.19, s * 0.04, 0, 6.283); g.fill();
  g.restore();
}

// ------------------------------------------------------------------ AVIS (texte exact : voir INVENTAIRE.md)
const AVIS = [
  { date: '12 septembre 2022', cat: 'Extensions de cils', img: 'cils-cateyes-1', msgs: ['Moi j’adore ta pose de cils car ils tiennent vraiment dans le temps !\nEt en plus de ça tu donnes des supers bons conseils pour qu’ils soient en bonne santé ☺️'] },
  { date: '26 septembre 2022', cat: 'Extensions de cils', img: 'cils-wispy-brun', msgs: ['Coucou petit message pour te dire que après 1 semaines les cils non pas du tout bouger, j’ai jamais aussi bien tenue des cils! Je suis vraiment contente du résultat 🫶'] },
  { date: '8 novembre 2022', cat: 'Extensions de cils', img: 'cils-freckles', msgs: ['petit sms pr te dire que vraiment ma pose est encore trop belle, pleins de copine me dmd ou je vais aha 😋 vraiment t’es au top merciii ❤️'] },
  { date: '10 novembre 2022', cat: 'Extensions de cils', img: 'cils-mapping', msgs: ['Merci beaucoup pour ma pause de ciné mon chat elle est un croyable', 'Pose cils*'] },
  { date: '30 mai 2023', cat: 'Extensions de cils', img: 'cils-yeux-verts', msgs: ['Coucou chou les cils j’ai rien à dire, ils tiennent super bien et pourtant j’ai pleurer Hahaaa\nJe suis trop contente!'] },
  { date: '7 juin 2023', cat: 'Extensions de cils', img: 'cils-cateyes-2', msgs: ['En tout cas je voulais te dire que je suis pas déçue et que ça tiens bien et que tu me reverra certainement,Mercii à toi 💗'] },
  { date: '28 mars 2024', cat: 'Lampe UV', img: 'cils-yeux-bruns', msgs: ['Hello,\n\nMon avis est qu’avec la lampe UV ça tiens mieux qu’avec le colle, certes il y a des chutes c’est inévitable mais en tout cas moi je préfère la lampe UV 😁\n\nTon travail je n’ai rien à dire, professionnel et très accueillante comme à chaque fois 💗\n\nC’est toujours un plaisir de venir faire mes cils chez toi !\n\nJe recommande 🥰'] },
  { date: '28 mars 2024', cat: 'Lampe UV', img: 'rehaussement-regard', msgs: ['Oui franchement je suis vraiment satisfaite de ouf,Ça fait 3 semaines j’ai l’impression que je viens de faire une pause'] },
  { date: '28 mars 2024', cat: 'Lampe UV', img: 'cils-wispy-brun', msgs: ['Très satisfaite que se soit avant la lampe Uv ou maintenant avec! C’est toi la bestttttt💗'] },
  { date: '24 octobre 2025', cat: '', img: 'sourcils-browlift', msgs: ['J’aime tellement ton travail !'] },
  { date: '14 novembre 2025', cat: 'Extensions de cils', img: 'cils-cateyes-1', msgs: ['Coucou tu vas bien?\nJe voulais te dmd si on pouvait fixer un rdv stp??\nPar contre, la tenue des cils INCROYABLE 😍😍😍'] },
  { date: '9 août', cat: 'Extensions de cils', img: 'rehaussement-yeux-verts', msgs: ['Juste pour te dire que mes cils sont incroyables ! J’aime trop ✨'] },
];
const MOTS = ['Tu m’as réconciliée avec mes cils', 'Vous a mentionnez en story', 'Tu es la seule à qui je fais confiance', 'Fidèle depuis des années',
  'C’est exactement ce que je voulais', 'Je viens de la part de…', 'Tu es la meilleure', 'Ton travail mérite + de visibilité', 'Merci pour ton écoute'];

// ------------------------------------------------------------------ SCÈNES
// Chaque scène : { id, dur, draw(g, lt, d), cues: [{t, type, ...}] (temps locaux) }
const S = [];
const add = (id, dur, draw, cues = []) => S.push({ id, dur, draw, cues });

// 1. OUVERTURE — la formatrice (photo intacte), SETÍLA, APPRENDRE - PROGRESSER - RÉUSSIR
add('ouverture', 8.4, (g, lt) => {
  background(g, lt);
  // halo doré derrière le cadre (fond uniquement)
  const hk = E.out(seg(lt, 0.6, 2.4));
  const rg = g.createRadialGradient(W / 2, 900, 50, W / 2, 900, 640);
  rg.addColorStop(0, `rgba(220,195,145,${0.45 * hk})`); rg.addColorStop(1, 'rgba(220,195,145,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  // rayons lumineux lents sur le fond
  g.save(); g.globalAlpha = 0.18 * hk; g.translate(W / 2, 380); g.rotate(lt * 0.04);
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); const lg2 = g.createLinearGradient(0, 0, 0, 1300); lg2.addColorStop(0, 'rgba(255,248,232,0.9)'); lg2.addColorStop(1, 'rgba(255,248,232,0)'); g.fillStyle = lg2; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(80, 1300); g.lineTo(-80, 1300); g.fill(); }
  g.restore();
  // cadre photo : révélation par volet vertical + légère poussée de caméra (échelle uniforme)
  const w = 820, h = Math.round(820 * IMG.formatrice.height / IMG.formatrice.width);
  const x = (W - w) / 2, y = 470 + (1 - E.out(seg(lt, 0.8, 2.2))) * 60;
  const rv = E.inOut(seg(lt, 0.8, 2.0));
  const out = E.inOut(seg(lt, 7.6, 8.4));
  if (rv > 0) {
    g.save(); g.beginPath(); g.rect(0, y + h / 2 - (h / 2 + 40) * rv, W, (h + 80) * rv); g.clip();
    photoFrame(g, IMG.formatrice, x, y - out * 40, w, h, { zoom: 1.0 + 0.06 * E.sine(seg(lt, 0.8, 8.4)), fy: 0.35, alpha: 1 - out });
    g.restore();
  }
  // coins dorés décoratifs
  const ck = E.out(seg(lt, 1.8, 2.6)) * (1 - out);
  if (ck > 0) {
    g.save(); g.strokeStyle = rgba(C.gold, ck); g.lineWidth = 3;
    const m = 22, L = 70 * ck;
    [[x - m, y - m, 1, 1], [x + w + m, y - m, -1, 1], [x - m, y + h + m, 1, -1], [x + w + m, y + h + m, -1, -1]].forEach(([cx, cy, sx, sy]) => { g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke(); });
    g.restore();
  }
  // SETÍLA (point doré sur le Í comme le logo)
  g.save(); g.globalAlpha = 1 - out;
  const tw = lettersIn(g, 'SETÍLA', W / 2, 395, 132, F.logo, lt - 0.15, { color: C.ink, trackFrom: 70, track: 22, stagger: 0.09, foil: true });
  const dk = E.back(seg(lt, 1.2, 1.7));
  if (dk > 0) { g.fillStyle = C.gold; g.beginPath(); g.arc(W / 2 + tw * 0.08, 262 + (1 - dk) * -30, 8 * dk, 0, 6.283); g.fill(); }
  sparkle(g, W / 2 + tw / 2 + 24, 300, 7, win(lt, 1.4, 1.8, 2.2, 2.9));
  goldLine(g, W / 2, 432, 360, seg(lt, 1.0, 2.0));
  g.restore();
  // APPRENDRE - PROGRESSER - RÉUSSIR (mot à mot, sur le temps)
  const words = ['APPRENDRE', 'PROGRESSER', 'RÉUSSIR'];
  font(g, 38, F.serif, 600, '', 4);
  const sep = '  ·  ';
  const parts = [words[0], sep, words[1], sep, words[2]];
  const ws = parts.map((p) => g.measureText(p).width);
  let cx = W / 2 - ws.reduce((a, b) => a + b, 0) / 2;
  const by = y + h + 92;
  g.save(); g.globalAlpha = 1 - out;
  const bandK = E.out(seg(lt, 3.0, 3.6));
  const bw = ws.reduce((a, b) => a + b, 0) + 90;
  g.fillStyle = rgba(C.chocD, 0.92 * bandK); roundRect(g, W / 2 - bw / 2 * bandK, by - 54, bw * bandK, 80, 40); g.fill();
  parts.forEach((p, i) => {
    const wi = Math.floor(i / 2) * 0.55 + (i % 2) * 0.3;
    const k = E.out(seg(lt, 3.4 + wi, 3.9 + wi));
    g.globalAlpha = (1 - out) * k; g.fillStyle = i % 2 ? C.goldL : C.ivory; g.textAlign = 'left';
    font(g, 38, F.serif, 600, '', 4);
    g.fillText(p, cx, by + (1 - k) * 14);
    cx += ws[i];
  });
  g.restore();
  dust(g, lt, 0.8);
}, [{ t: 0.15, type: 'shimmer', gain: 0.7 }, { t: 0.8, type: 'whoosh', dur: 1.2, gain: 0.6 }, { t: 1.2, type: 'logo', gain: 0.9 }, { t: 3.4, type: 'soft', gain: 0.6 }, { t: 3.95, type: 'soft', gain: 0.55 }, { t: 4.5, type: 'soft', gain: 0.6 }, { t: 7.7, type: 'whoosh', dur: 0.8, gain: 0.5 }]);

// 2. ACCROCHE
add('accroche', 4.2, (g, lt) => {
  background(g, lt, 'choc');
  dust(g, lt, 0.9);
  revealText(g, 'La beauté du regard,', W / 2, 860, 120, F.script, seg(lt, 0.2, 1.4), { color: C.goldL, foil: true });
  revealText(g, 'sublimée avec passion.', W / 2, 1000, 74, F.serif, seg(lt, 0.9, 2.0), { style: 'italic', weight: 400, color: C.ivory });
  goldLine(g, W / 2, 1080, 300, seg(lt, 1.4, 2.4), true, C.goldL);
  sparkle(g, W / 2 + 330, 760, 8, win(lt, 1.2, 1.6, 2.4, 3.2));
  finish(g, lt, true);
}, [{ t: 0.2, type: 'shimmer', gain: 0.6 }, { t: 1.0, type: 'soft', gain: 0.4 }]);

// 3. PRESTATIONS — une séquence par prestation
function gallery(g, lt, dur, imgs, frame) {
  // fondu enchaîné entre les photos, travelling doux
  const n = imgs.length, per = dur / n;
  imgs.forEach((im, i) => {
    const a = i === 0 ? 1 : E.inOut(seg(lt, i * per - 0.4, i * per + 0.4));
    const z = 1.02 + 0.07 * seg(lt, i * per - 0.4, (i + 1) * per + 0.4);
    if (a > 0) photoFrame(g, IMG[im.n], frame.x, frame.y, frame.w, frame.h, { zoom: z, fx: im.fx ?? 0.5, fy: im.fy ?? 0.5, alpha: a, r: 30 });
  });
}
function prestation(id, dur, kicker, title, sub, imgs, extra, cues = [], dark = false) {
  add(id, dur, (g, lt) => {
    background(g, lt, dark ? 'choc' : 'ivory');
    sectionTitle(g, lt, kicker, title, 300, dark, sub);
    const fy = sub ? 560 : 500, fh = SAFE.b - fy - (extra ? 250 : 40);
    const fk = E.out(seg(lt, 0.35, 1.2));
    g.save(); g.globalAlpha = fk; g.translate(0, (1 - fk) * 50);
    gallery(g, lt, dur, imgs, { x: 90, y: fy, w: W - 180, h: fh });
    g.restore();
    if (extra) extra(g, lt, SAFE.b - 210);
    dust(g, lt, 0.5, dark ? C.goldL : C.gold);
    finish(g, lt, dark);
  }, [{ t: 0, type: 'whoosh', dur: 0.7, gain: 0.55 }, { t: 0.3, type: 'shimmer', gain: 0.4 }, ...cues]);
}
function chips(g, lt, y, labels, t0 = 1.0, dark = false) {
  font(g, 30, F.sans, 500, '', 3);
  const ws = labels.map((l) => g.measureText(l).width + 56);
  let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + 18 * (labels.length - 1)) / 2;
  labels.forEach((l, i) => {
    const k = E.back(seg(lt, t0 + i * 0.18, t0 + i * 0.18 + 0.5));
    if (k > 0) {
      g.save(); g.translate(x + ws[i] / 2, y); g.scale(k, k);
      g.fillStyle = dark ? 'rgba(248,242,233,0.1)' : 'rgba(255,255,255,0.75)'; g.strokeStyle = rgba(C.gold, 0.8); g.lineWidth = 1.5;
      roundRect(g, -ws[i] / 2, -32, ws[i], 64, 32); g.fill(); g.stroke();
      g.fillStyle = dark ? C.ivory : C.choc; g.textAlign = 'center'; font(g, 30, F.sans, 500, '', 3); g.fillText(l, 0, 11);
      g.restore();
    }
    x += ws[i] + 18;
  });
}
prestation('extensions', 8, 'PRESTATION', 'Extensions de cils', 'Russian volume · Cat eyes · Brown wispy',
  [{ n: 'cils-cateyes-1' }, { n: 'cils-cateyes-2' }, { n: 'cils-wispy-brun' }, { n: 'cils-mapping' }],
  (g, lt, y) => chips(g, lt, y + 90, ['RUSSIAN VOLUME', 'CAT EYES', 'WISPY'], 1.2), [{ t: 2.0, type: 'whoosh', dur: 0.5, gain: 0.3 }, { t: 4.0, type: 'whoosh', dur: 0.5, gain: 0.3 }, { t: 6.0, type: 'whoosh', dur: 0.5, gain: 0.3 }]);
prestation('rehaussement', 6, 'PRESTATION', 'Rehaussement de cils', 'Un regard ouvert, naturellement',
  [{ n: 'rehaussement-regard' }, { n: 'rehaussement-yeux-verts' }, { n: 'rehaussement-reaction', fy: 0.3 }], null, [{ t: 2.0, type: 'whoosh', dur: 0.5, gain: 0.3 }, { t: 4.0, type: 'whoosh', dur: 0.5, gain: 0.3 }]);
prestation('browlift', 6, 'PRESTATION', 'Browlift & sourcils', 'Mapping · browlift · teinture hybride',
  [{ n: 'browlift-mapping' }, { n: 'sourcils-browlift' }, { n: 'browlift-produits' }], null, [{ t: 2.0, type: 'whoosh', dur: 0.5, gain: 0.3 }, { t: 4.0, type: 'whoosh', dur: 0.5, gain: 0.3 }]);
const STRASS = ['Sans danger et réversible', 'Pose rapide, sans perçage ni douleur', 'Tenue : 1 mois à + d’1 an selon ton hygiène et ta salive', 'Tombe dans les 3 semaines ? Remplacement 1x gratuit'];
add('strass', 10, (g, lt) => {
  background(g, lt, 'choc');
  sectionTitle(g, lt, 'PRESTATION', 'Strass dentaires', 300, true);
  const fk = E.out(seg(lt, 0.3, 1.1));
  g.save(); g.globalAlpha = fk;
  const fw = 430, fh = 560, fy = 480;
  photoFrame(g, IMG['strass-1'], 90, fy, fw, fh, { zoom: 1.05 + 0.05 * seg(lt, 0, 10), fx: 0.4 });
  photoFrame(g, IMG['strass-2'], W - 90 - fw, fy + 40, fw, fh, { zoom: 1.05 + 0.05 * seg(lt, 0, 10), fy: 0.45 });
  g.restore();
  sparkle(g, 250, fy + 260, 9, win(lt, 1.2, 1.5, 1.9, 2.4));
  sparkle(g, 790, fy + 330, 8, win(lt, 1.6, 1.9, 2.3, 2.8));
  // infos (texte de la propriétaire, sans retouche)
  let y = fy + fh + 120;
  STRASS.forEach((s, i) => {
    const k = E.out(seg(lt, 2.0 + i * 0.6, 2.6 + i * 0.6));
    g.save(); g.globalAlpha = k; g.translate((1 - k) * 40, 0);
    font(g, 36, F.sans, 400, '', 0); const lines = wrap(g, s, 800);
    icon(g, 'diamond', 120, y - 12, 22, C.goldL);
    lines.forEach((l, j) => { g.fillStyle = C.ivory; g.textAlign = 'left'; font(g, 36, F.sans, 400); g.fillText(l, 165, y + j * 46); });
    g.restore();
    y += lines.length * 46 + 26;
  });
  dust(g, lt, 0.6);
  finish(g, lt, true);
}, [{ t: 0, type: 'whoosh', dur: 0.7, gain: 0.55 }, { t: 1.25, type: 'chime', gain: 0.6 }, { t: 1.65, type: 'chime', gain: 0.5 }, ...[0, 1, 2, 3].map((i) => ({ t: 2.0 + i * 0.6, type: 'soft', gain: 0.35 }))]);
add('papouilles', 8, (g, lt) => {
  background(g, lt, 'choc');
  const fk = E.out(seg(lt, 0.2, 1.2));
  photoFrame(g, IMG['papouilles-ambiance'], 90, 300, W - 180, 520, { zoom: 1.04 + 0.06 * seg(lt, 0, 8), alpha: fk, fy: 0.5 });
  revealText(g, 'Papouilles', W / 2, 990, 150, F.script, seg(lt, 0.7, 1.7), { color: C.goldL, foil: true });
  revealText(g, 'Un moment rien qu’à vous…', W / 2, 1065, 48, F.serif, seg(lt, 1.2, 2.0), { style: 'italic', color: C.cream });
  revealText(g, 'RELAXATION  •  BIEN-ÊTRE  •  ÉVASION', W / 2, 1135, 28, F.sans, seg(lt, 1.6, 2.4), { weight: 500, track: 5, color: C.goldL });
  [['15 min', '15€', '(après un soin)'], ['30 min', '25€', ''], ['45 min', '35€', '']].forEach(([a, b, c], i) => {
    const k = E.back(seg(lt, 2.4 + i * 0.35, 2.9 + i * 0.35));
    if (k <= 0) return;
    const cx = 220 + i * 320, cy = 1290;
    g.save(); g.translate(cx, cy); g.scale(k, k);
    g.strokeStyle = C.goldL; g.lineWidth = 2; roundRect(g, -140, -62, 280, 124, 62); g.stroke();
    g.fillStyle = C.ivory; g.textAlign = 'center'; font(g, 44, F.serif, 500, 'italic'); g.fillText(`${a}  |  ${b}`, 0, c ? 6 : 15);
    if (c) { font(g, 22, F.sans, 400); g.fillStyle = C.cream; g.fillText(c, 0, 42); }
    g.restore();
  });
  dust(g, lt, 0.6);
  finish(g, lt, true);
}, [{ t: 0, type: 'whoosh', dur: 0.8, gain: 0.5 }, { t: 0.8, type: 'shimmer', gain: 0.45 }, ...[0, 1, 2].map((i) => ({ t: 2.45 + i * 0.35, type: 'pop', gain: 0.45 }))]);

// 4. FORMATIONS — affiches RECRÉÉES (aucune personne)
add('formations', 6, (g, lt) => {
  background(g, lt);
  revealText(g, 'LE TEMPS DU CHANGEMENT EST ARRIVÉ', W / 2, 400, 28, F.sans, seg(lt, 0.1, 0.8), { weight: 500, track: 6, color: C.gold });
  revealText(g, 'DEVENEZ VOTRE', W / 2, 560, 92, F.serif, seg(lt, 0.3, 1.1), { weight: 500, color: C.ink });
  revealText(g, 'PROPRE BOSS GIRL', W / 2, 670, 92, F.serif, seg(lt, 0.5, 1.3), { weight: 500, color: C.ink, foil: true });
  revealText(g, 'Formations Professionnelles', W / 2, 810, 96, F.script, seg(lt, 1.0, 2.0), { color: C.choc });
  const bk = E.out(seg(lt, 1.6, 2.3));
  g.fillStyle = rgba(C.powder, 0.95 * bk); g.fillRect(W / 2 - 440 * bk, 880, 880 * bk, 76);
  revealText(g, 'APPRENEZ. MAÎTRISEZ. RÉVÉLEZ VOTRE TALENT.', W / 2, 930, 28, F.sans, seg(lt, 1.9, 2.6), { weight: 500, track: 3, color: C.choc });
  revealText(g, 'Experte depuis 2021', W / 2, 1080, 56, F.serif, seg(lt, 2.5, 3.2), { style: 'italic', color: C.text });
  revealText(g, 'Châtelet, Belgique', W / 2, 1150, 34, F.sans, seg(lt, 2.8, 3.4), { weight: 400, track: 4, color: C.gold });
  goldLine(g, W / 2, 1230, 480, seg(lt, 3.0, 3.9));
  revealText(g, 'EXTENSION · LASHLIFT · BROWLIFT', W / 2, 1320, 32, F.sans, seg(lt, 3.3, 4.0), { weight: 500, track: 4, color: C.choc });
  revealText(g, 'BLANCHIMENT · STRASS · PAPOUILLES', W / 2, 1380, 32, F.sans, seg(lt, 3.5, 4.2), { weight: 500, track: 4, color: C.choc });
  dust(g, lt, 0.5, C.gold);
  finish(g, lt);
}, [{ t: 0, type: 'whoosh', dur: 0.8, gain: 0.55 }, { t: 0.5, type: 'impact', gain: 0.35 }, { t: 1.0, type: 'shimmer', gain: 0.45 }]);
function formation(id, title, icons, extraTop) {
  add(id, 6.5, (g, lt) => {
    background(g, lt);
    let y = 330;
    if (extraTop) {
      const k = E.out(seg(lt, 0.0, 0.5));
      g.fillStyle = rgba(C.chocD, 0.92 * k); roundRect(g, W / 2 - 380, y - 52, 760, 76, 38); g.fill();
      revealText(g, extraTop, W / 2, y, 36, F.sans, seg(lt, 0.2, 0.8), { weight: 500, track: 1, color: C.ivory });
      y += 90;
    }
    revealText(g, 'DEVENEZ EXPERTE EN', W / 2, y + 30, 30, F.sans, seg(lt, 0.1, 0.7), { weight: 500, track: 6, color: C.gold });
    title.forEach((l, i) => revealText(g, l, W / 2, y + 130 + i * 98, 96, F.serif, seg(lt, 0.25 + i * 0.15, 1.1 + i * 0.15), { weight: 500, color: C.ink, foil: true }));
    y += 130 + title.length * 98;
    revealText(g, 'Formations Professionnelles', W / 2, y + 20, 72, F.script, seg(lt, 0.8, 1.6), { color: C.choc });
    y += 90;
    icons.forEach(([ic, a, b], i) => {
      const k = E.out(seg(lt, 1.3 + i * 0.35, 1.9 + i * 0.35));
      if (k <= 0) return;
      const yy = y + i * 138;
      g.save(); g.globalAlpha = k; g.translate((1 - k) * 60, 0);
      icon(g, ic, 150, yy + 10, 42, C.gold);
      g.textAlign = 'left'; g.fillStyle = C.ink; font(g, 34, F.sans, 600, '', 3); g.fillText(a, 222, yy);
      g.fillStyle = C.text; font(g, 30, F.sans, 400); g.fillText(b, 222, yy + 46);
      g.restore();
    });
    dust(g, lt, 0.4, C.gold);
    finish(g, lt);
  }, [{ t: 0, type: 'whoosh', dur: 0.7, gain: 0.5 }, { t: 0.35, type: 'impact', gain: 0.3 }, ...icons.map((_, i) => ({ t: 1.3 + i * 0.35, type: 'soft', gain: 0.3 }))]);
}
formation('f-extensions', ['EXTENSIONS', 'DE CILS'], [['cap', 'FORMATION COMPLÈTE & KIT INCLUS', 'Tout le nécessaire pour démarrer'], ['user', 'ACCOMPAGNEMENT PERSONNALISÉ', 'Avant, pendant et après la formation'], ['eye', 'MAPPING & TECHNIQUES RÉCENTES', 'Un résultat pro, adapté à chaque cliente'], ['phone', 'VISIBILITÉ & RÉSEAUX SOCIAUX', 'Démarque-toi sur Instagram']], 'Formation en 2 ou 4 j (au choix)');
formation('f-browlift', ['BROWLIFT &', 'TEINTURE HYBRIDE'], [['brow', 'FORMATION COMPLÈTE & KIT INCLUS', 'Tout le nécessaire pour démarrer'], ['user', 'ACCOMPAGNEMENT PERSONNALISÉ', 'Suivi, conseils et entraide'], ['star', 'TECHNIQUES PROFESSIONNELLES', '& résultats garantis'], ['phone', 'VISIBILITÉ & RÉSEAUX SOCIAUX', 'Développe ton activité sur Instagram']]);
formation('f-blanchiment', ['BLANCHIMENT', 'DENTAIRE'], [['tooth', 'FORMATION COMPLÈTE & KIT INCLUS', 'Tout le nécessaire pour démarrer'], ['user', 'ACCOMPAGNEMENT PERSONNALISÉ', 'Avant, pendant et après la formation'], ['tooth', 'TECHNIQUES PROFESSIONNELLES', '& sécurisées'], ['phone', 'VISIBILITÉ & RÉSEAUX SOCIAUX', 'Développe ton activité sur Instagram']]);
add('f-fin', 5.5, (g, lt) => {
  background(g, lt, 'choc');
  [['cap', 'FORMATIONS ACCESSIBLES', 'Débutantes ou confirmées'], ['star', 'RÉSULTATS GARANTIS', 'Qualité & professionnalisme'], ['crown', 'LANCEZ-VOUS EN TOUTE CONFIANCE', 'Je vous accompagne vers le succès']].forEach(([ic, a, b], i) => {
    const k = E.out(seg(lt, 0.2 + i * 0.4, 0.8 + i * 0.4));
    if (k <= 0) return;
    const y = 470 + i * 220;
    g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 40);
    icon(g, ic, W / 2, y - 60, 46, C.goldL);
    g.textAlign = 'center'; g.fillStyle = C.ivory; font(g, 36, F.sans, 600, '', 3); g.fillText(a, W / 2, y + 30);
    g.fillStyle = C.cream; font(g, 32, F.serif, 400, 'italic'); g.fillText(b, W / 2, y + 76);
    g.restore();
  });
  revealText(g, 'Plus qu’une formation,', W / 2, 1200, 70, F.script, seg(lt, 1.8, 2.6), { color: C.goldL });
  revealText(g, 'un véritable tremplin pour votre avenir !', W / 2, 1270, 44, F.serif, seg(lt, 2.2, 3.0), { style: 'italic', color: C.ivory });
  revealText(g, 'RÉSERVEZ VOTRE PLACE', W / 2, 1380, 32, F.sans, seg(lt, 2.8, 3.4), { weight: 600, track: 6, color: C.goldL });
  revealText(g, 'ET TRANSFORMEZ VOTRE PASSION EN MÉTIER !', W / 2, 1430, 26, F.sans, seg(lt, 3.0, 3.6), { weight: 400, track: 4, color: C.cream });
  dust(g, lt, 0.7);
  finish(g, lt, true);
}, [{ t: 0, type: 'whoosh', dur: 0.7, gain: 0.5 }, { t: 0.2, type: 'soft', gain: 0.35 }, { t: 0.6, type: 'soft', gain: 0.35 }, { t: 1.0, type: 'soft', gain: 0.35 }, { t: 1.8, type: 'shimmer', gain: 0.45 }]);

// 5. AVIS CLIENTES
add('avis-titre', 4, (g, lt) => {
  background(g, lt);
  revealText(g, 'ELLES EN PARLENT', W / 2, 760, 32, F.sans, seg(lt, 0.1, 0.8), { weight: 500, track: 10, color: C.gold });
  revealText(g, 'Avis clientes', W / 2, 920, 150, F.script, seg(lt, 0.3, 1.4), { color: C.choc, foil: true });
  goldLine(g, W / 2, 990, 420, seg(lt, 0.9, 1.8));
  revealText(g, 'Messages authentiques, reproduits mot pour mot', W / 2, 1070, 40, F.serif, seg(lt, 1.3, 2.1), { style: 'italic', color: C.text });
  for (let i = 0; i < 5; i++) { const k = E.back(seg(lt, 1.6 + i * 0.12, 2.0 + i * 0.12)); if (k > 0) { g.save(); g.translate(W / 2 - 160 + i * 80, 1180); g.scale(k, k); star(g, 0, 0, 26, C.gold); g.restore(); } }
  dust(g, lt, 0.6, C.gold);
  finish(g, lt);
}, [{ t: 0, type: 'whoosh', dur: 0.8, gain: 0.5 }, { t: 0.4, type: 'logo', gain: 0.6 }, ...[0, 1, 2, 3, 4].map((i) => ({ t: 1.6 + i * 0.12, type: 'chime', gain: 0.25 }))]);
function star(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

const TXT = { size: 46, lh: 64, maxW: 800 };
function readTime(str) { return clamp(2.0 + [...str].length / 20, 4.5, 16); }
AVIS.forEach((a, idx) => {
  const all = a.msgs.join(' ');
  // pré-calcul : taille de police et présence du bandeau photo selon la longueur
  const probe = document.createElement('canvas').getContext('2d');
  const measure = (size) => { font(probe, size, F.sans, 400); let h = 0; a.msgs.forEach((m) => { wrap(probe, m, TXT.maxW).forEach((l) => { h += l ? size * 1.39 : size * 0.6; }); h += 30; }); return h; };
  let band = true, size = TXT.size;
  const room = (b) => SAFE.b - 30 - ((b ? 610 : 280) + 230);
  if (measure(size) > room(true)) band = false;
  while (measure(size) > room(band) && size > 34) size -= 2;
  const lh = Math.round(size * 1.39);
  add(`avis-${idx + 1}`, readTime(all) + 1.0, (g, lt, d) => {
    background(g, lt);
    // photo de prestation en bandeau (au-dessus de la carte, jamais sous le texte)
    const pk = E.out(seg(lt, 0, 0.8));
    if (band) photoFrame(g, IMG[a.img], 90, 270, W - 180, 300, { zoom: 1.08 + 0.05 * seg(lt, 0, d), alpha: pk, r: 24 });
    // carte
    const ck = E.out(seg(lt, 0.25, 1.0));
    const cy = (band ? 610 : 280) + (1 - ck) * 50;
    g.save(); g.globalAlpha = ck;
    const flip = E.out(seg(lt, 0.25, 0.95)), cmy = (cy + SAFE.b) / 2;
    g.translate(W / 2, cmy); g.scale(lerp(0.35, 1, flip), 1); g.rotate(0.004 * Math.sin(lt * 0.9)); g.translate(-W / 2, -cmy + 5 * Math.sin(lt * 1.1));
    g.shadowColor = 'rgba(80,50,30,0.18)'; g.shadowBlur = 40; g.shadowOffsetY = 16;
    g.fillStyle = '#fffdf9'; roundRect(g, 70, cy, W - 140, SAFE.b - cy - 10, 34); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = rgba(C.goldL, 0.8); g.lineWidth = 1.5; roundRect(g, 82, cy + 12, W - 164, SAFE.b - cy - 34, 26); g.stroke();
    // en-tête : guillemet, date, prestation
    g.fillStyle = C.goldL; font(g, 150, F.serif, 500); g.textAlign = 'left'; g.fillText('“', 108, cy + 128);
    g.textAlign = 'right'; g.fillStyle = C.gold; font(g, 28, F.sans, 600, '', 4); g.fillText(a.date.toUpperCase(), W - 110, cy + 68);
    if (a.cat) { g.fillStyle = C.text; font(g, 30, F.serif, 500, 'italic'); g.fillText(a.cat, W - 110, cy + 112); }
    for (let i = 0; i < 5; i++) star(g, W - 110 - 4 * 34 + i * 34 - 10, cy + 150, 11, C.gold);
    // texte complet (bulles)
    let y = cy + 230;
    font(g, size, F.sans, 400);
    a.msgs.forEach((m, mi) => {
      const lines = wrap(g, m, TXT.maxW);
      lines.forEach((l, li) => {
        const k = E.out(seg(lt, 0.6 + (mi * 6 + li) * 0.07, 1.2 + (mi * 6 + li) * 0.07));
        g.globalAlpha = ck * k; g.fillStyle = C.ink; g.textAlign = 'left'; font(g, size, F.sans, 400);
        if (l) g.fillText(l, 130, y + (1 - k) * 12);
        y += l ? lh : size * 0.6;
      });
      y += 30;
    });
    g.restore();
    dust(g, lt, 0.3, C.gold);
    finish(g, lt);
  }, [{ t: 0, type: 'whoosh', dur: 0.6, gain: 0.35 }, { t: 0.3, type: 'soft', gain: 0.3 }]);
});
add('mots', 9, (g, lt) => {
  background(g, lt, 'choc');
  revealText(g, 'Leurs mots', W / 2, 400, 120, F.script, seg(lt, 0.1, 1.0), { color: C.goldL, foil: true });
  revealText(g, 'EXTRAITS PARTAGÉS PAR SETÍLA', W / 2, 470, 26, F.sans, seg(lt, 0.4, 1.0), { weight: 500, track: 5, color: C.cream });
  MOTS.forEach((m, i) => {
    const k = E.out(seg(lt, 0.8 + i * 0.35, 1.4 + i * 0.35));
    if (k <= 0) return;
    const y = 590 + i * 96;
    g.save(); g.globalAlpha = k; g.translate((i % 2 ? 1 : -1) * (1 - k) * 60, 0);
    g.fillStyle = C.ivory; g.textAlign = 'center'; font(g, 44, F.serif, 500, 'italic'); g.fillText(`« ${m} »`, W / 2, y);
    g.restore();
  });
  dust(g, lt, 0.6);
  finish(g, lt, true);
}, MOTS.map((_, i) => ({ t: 0.8 + i * 0.35, type: 'soft', gain: 0.22 })));

// 6. FINAL — SETÌLA STUDIO, Instagram, site
const HANDLE = '@setila.studio_';
const SITE = 'https://iarabeauty.com/';
add('final', 12, (g, lt) => {
  background(g, lt);
  const rg = g.createRadialGradient(W / 2, 820, 40, W / 2, 820, 700);
  rg.addColorStop(0, 'rgba(225,200,155,0.35)'); rg.addColorStop(1, 'rgba(225,200,155,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  // 1. nom
  lettersIn(g, 'SETÌLA', W / 2, 640, 150, F.logo, lt - 0.2, { color: C.ink, trackFrom: 80, track: 26, stagger: 0.08, foil: true });
  revealText(g, 'S T U D I O', W / 2, 730, 44, F.serif, seg(lt, 0.9, 1.6), { weight: 500, track: 10, color: C.gold });
  goldLine(g, W / 2, 785, 520, seg(lt, 1.1, 2.0));
  revealText(g, 'Beauté du regard & du sourire', W / 2, 880, 78, F.script, seg(lt, 1.5, 2.5), { color: C.choc });
  sparkle(g, W / 2 + 330, 600, 9, win(lt, 1.0, 1.4, 1.8, 2.5));
  // 2. logo Instagram « pop »  3. pseudo déroulé caractère par caractère
  const pk = E.back(seg(lt, 3.0, 3.45));
  font(g, 50, F.sans, 500);
  const hw = g.measureText(HANDLE).width;
  const lx = W / 2 - (hw + 90) / 2 + 30, ly = 1040;
  if (pk > 0) { g.save(); g.translate(lx, ly); g.scale(pk, pk); instagramLogo(g, 0, 0, 64); g.restore(); }
  const n = Math.floor(clamp((lt - 3.5) / 0.055, 0, HANDLE.length));
  if (n > 0) {
    const shown = HANDLE.slice(0, n);
    g.fillStyle = C.ink; g.textAlign = 'left'; font(g, 50, F.sans, 500); g.fillText(shown, lx + 58, ly + 17);
    if (n < HANDLE.length) { const cw = g.measureText(shown).width; g.fillStyle = C.gold; g.fillRect(lx + 62 + cw, ly - 22, 3, 46); }
  }
  // 4. site + appel à l'action
  const ck = E.out(seg(lt, 5.0, 5.7));
  if (ck > 0) {
    g.save(); g.globalAlpha = ck;
    g.fillStyle = C.chocD; roundRect(g, W / 2 - 330, 1170 + (1 - ck) * 20, 660, 92, 46); g.fill();
    g.fillStyle = C.ivory; g.textAlign = 'center'; font(g, 34, F.sans, 600, '', 4); g.fillText('RÉSERVE TON RENDEZ-VOUS', W / 2, 1228 + (1 - ck) * 20);
    g.restore();
  }
  revealText(g, SITE, W / 2, 1345, 50, F.sans, seg(lt, 5.5, 6.4), { weight: 500, color: C.choc });
  goldLine(g, W / 2, 1375, 620, seg(lt, 6.0, 6.9));
  dust(g, lt, 0.6, C.gold);
  finish(g, lt);

}, [{ t: 0.2, type: 'logo', gain: 1.0 }, { t: 1.0, type: 'chime', gain: 0.4 }, { t: 3.0, type: 'pop', gain: 0.8 }, { t: 3.5, type: 'type', dur: HANDLE.length * 0.055, gain: 0.35 }, { t: 5.0, type: 'soft', gain: 0.5 }, { t: 5.5, type: 'shimmer', gain: 0.5 }, { t: 10.6, type: 'end', gain: 0.8 }]);

// ------------------------------------------------------------------ VERSION COURTE (~50 s) : sélection + accélération
const SHORT = { ouverture: 5.2, accroche: 2.8, extensions: 3.6, rehaussement: 3, browlift: 3, strass: 3.5, papouilles: 3,
  formations: 3, 'f-extensions': 2.4, 'f-browlift': 2.4, 'f-blanchiment': 2.4, 'avis-titre': 1.8,
  'avis-12': 2.6, 'avis-9': 3, 'avis-10': 2.2, final: 6 };
{
  const keep = S.filter((sc) => SHORT[sc.id]);
  S.length = 0;
  keep.forEach((sc) => {
    const orig = sc.dur, f = orig / SHORT[sc.id], draw = sc.draw;
    sc.dur = SHORT[sc.id];
    sc.draw = (g, lt) => draw(g, lt * f, orig);
    sc.cues = sc.cues.map((c) => ({ ...c, t: c.t / f, dur: c.dur ? c.dur / f : c.dur }));
    S.push(sc);
  });
}

// ------------------------------------------------------------------ horloge + transitions + post-production
let acc = 0;
for (const s of S) { s.start = acc; acc += s.dur; }
const DURATION = acc;
// transition D'ENTRÉE de chaque scène (toutes différentes, la formatrice n'est jamais déformée)
const TR = { accroche: 'flash', extensions: 'iris', rehaussement: 'zoom', browlift: 'wipe', strass: 'flash', papouilles: 'zoom',
  formations: 'wipe', 'f-extensions': 'flip', 'f-browlift': 'flip', 'f-blanchiment': 'flip', 'f-fin': 'zoom', 'avis-titre': 'iris',
  mots: 'flash', final: 'iris' };
S.forEach((sc, i) => { sc.trans = TR[sc.id] || (sc.id.startsWith('avis-') ? (i % 2 ? 'slide' : 'zoom') : 'fade'); });
const H2 = 0.38; // demi-durée de transition (s)

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let SA, SB, gA, gB, FXC, gFX, BLC, gBL, BOKEH;
function initPost() {
  SA = mk(W, H); SB = mk(W, H); gA = SA.getContext('2d'); gB = SB.getContext('2d');
  FXC = mk(W, H); gFX = FXC.getContext('2d'); BLC = mk(W / 4, H / 4); gBL = BLC.getContext('2d');
  // orbes de lumière (bokeh) pré-rendus
  BOKEH = [64, 110, 160].map((r) => { const c = mk(r * 2, r * 2), g = c.getContext('2d'); const rg = g.createRadialGradient(r, r, r * 0.55, r, r, r);
    rg.addColorStop(0, 'rgba(255,236,200,0.55)'); rg.addColorStop(0.85, 'rgba(255,230,190,0.35)'); rg.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = rg; g.fillRect(0, 0, r * 2, r * 2); return c; });
}
function drawScene(g, sc, t) { g.reset(); sc.draw(g, t - sc.start, sc.dur); }
function blurDraw(g, src, px, alpha = 1) { g.save(); g.globalAlpha = alpha; if (px > 0.4) g.filter = `blur(${px.toFixed(1)}px)`; g.drawImage(src, 0, 0); g.restore(); }

function compose(g, type, k, t) {
  const e = E.inOut(k);
  switch (type) {
    case 'zoom': { // traversée : A s'envole en zoom flouté, B arrive de la profondeur
      g.save(); g.translate(W / 2, H / 2); g.scale(1 + 0.22 * e, 1 + 0.22 * e); g.translate(-W / 2, -H / 2); blurDraw(g, SA, 16 * e, 1); g.restore();
      g.save(); g.translate(W / 2, H / 2); g.scale(0.9 + 0.1 * e, 0.9 + 0.1 * e); g.translate(-W / 2, -H / 2); blurDraw(g, SB, 16 * (1 - e), e); g.restore();
      return;
    }
    case 'flash': { // coupe sous un éclat de lumière dorée
      g.drawImage(k < 0.5 ? SA : SB, 0, 0);
      const f = Math.sin(Math.PI * k);
      const rg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.8);
      rg.addColorStop(0, `rgba(255,248,232,${0.95 * f})`); rg.addColorStop(0.5, `rgba(240,215,170,${0.55 * f})`); rg.addColorStop(1, `rgba(220,190,140,${0.15 * f})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      return;
    }
    case 'wipe': { // vague dorée diagonale
      g.drawImage(SA, 0, 0);
      const pos = lerp(-0.3, 1.3, e) * (W + H);
      g.save(); g.beginPath(); g.moveTo(0, 0);
      for (let y = 0; y <= H; y += 40) { const x = pos - y + 60 * Math.sin(y * 0.006 + t * 3); g.lineTo(clamp(x, -10, W + 10), y); }
      g.lineTo(-10, H); g.closePath(); g.clip(); g.drawImage(SB, 0, 0); g.restore();
      gFX.save(); gFX.lineWidth = 10; gFX.strokeStyle = 'rgba(240,210,150,0.95)'; gFX.beginPath();
      for (let y = 0; y <= H; y += 40) { const x = pos - y + 60 * Math.sin(y * 0.006 + t * 3); y ? gFX.lineTo(x, y) : gFX.moveTo(x, y); }
      gFX.stroke(); gFX.restore();
      return;
    }
    case 'flip': { // carte qui se retourne (pseudo-3D)
      const a = k < 0.5 ? SA : SB, q = k < 0.5 ? Math.cos(Math.PI * k) : -Math.cos(Math.PI * k);
      g.fillStyle = '#2b1d15'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2); g.scale(Math.max(0.02, q), 1 - 0.06 * (1 - q)); g.translate(-W / 2, -H / 2); g.drawImage(a, 0, 0);
      g.fillStyle = `rgba(30,18,10,${0.5 * (1 - q)})`; g.fillRect(0, 0, W, H); g.restore();
      return;
    }
    case 'iris': { // cercle qui s'ouvre, anneau doré
      g.drawImage(SA, 0, 0);
      const r = E.inOut(k) * Math.hypot(W, H) * 0.6;
      g.save(); g.beginPath(); g.arc(W / 2, H * 0.45, Math.max(1, r), 0, 6.283); g.clip(); g.drawImage(SB, 0, 0); g.restore();
      gFX.save(); gFX.strokeStyle = `rgba(245,215,160,${Math.sin(Math.PI * k)})`; gFX.lineWidth = 8; gFX.beginPath(); gFX.arc(W / 2, H * 0.45, Math.max(1, r), 0, 6.283); gFX.stroke(); gFX.restore();
      return;
    }
    case 'slide': { // poussée verticale avec flou de mouvement
      const m = 22 * Math.sin(Math.PI * k);
      g.save(); g.translate(0, -H * 0.35 * e); blurDraw(g, SA, m, 1 - e * 0.6); g.restore();
      g.save(); g.translate(0, H * 0.35 * (1 - e)); blurDraw(g, SB, m, e); g.restore();
      return;
    }
    default: g.drawImage(SA, 0, 0); blurDraw(g, SB, 0, e);
  }
}

// gerbes de paillettes / flares sur les temps forts (dérivés des cues)
const BURST = { logo: 1.2, chime: 0.6, pop: 0.8, impact: 0.9, end: 1.0 };
const BURST_POS = { ouverture: [0.5, 0.17], final: [0.5, 0.31], 'avis-titre': [0.5, 0.62], strass: [0.5, 0.4] };
function bursts(t) {
  for (const c of ALLCUES) {
    const amp = BURST[c.type]; if (!amp) continue;
    const dt = t - c.t; if (dt < 0 || dt > 1.8) continue;
    const [px, py] = c.type === 'pop' && c.seg === 'final' ? [0.36, 0.54] : (BURST_POS[c.seg] || [0.5, 0.45]);
    const r = rng(Math.floor(c.t * 1000));
    const n = Math.round(46 * amp);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, sp = (180 + r() * 520) * amp, life = 0.8 + r() * 1.0;
      if (dt > life) continue;
      const q = dt / life, d = sp * (1 - Math.pow(1 - q, 2.4)) * 0.9;
      const x = px * W + Math.cos(a) * d, y = py * H + Math.sin(a) * d + 120 * q * q;
      sparkle(gFX, x, y, 2.2 + r() * 3.5, (1 - q) * 0.9);
    }
    // flare anamorphique
    if (c.type === 'logo' || c.type === 'end') {
      const f = Math.exp(-dt / 0.5) * amp;
      gFX.save(); gFX.translate(px * W, py * H); gFX.scale(1, 0.03);
      const rg = gFX.createRadialGradient(0, 0, 0, 0, 0, W * 0.7); rg.addColorStop(0, `rgba(255,236,190,${0.9 * f})`); rg.addColorStop(1, 'rgba(255,236,190,0)');
      gFX.fillStyle = rg; gFX.fillRect(-W, -W, W * 2, W * 2); gFX.restore();
      const rg2 = gFX.createRadialGradient(px * W, py * H, 0, px * W, py * H, 160); rg2.addColorStop(0, `rgba(255,246,225,${0.8 * f})`); rg2.addColorStop(1, 'rgba(255,246,225,0)');
      gFX.fillStyle = rg2; gFX.fillRect(px * W - 160, py * H - 160, 320, 320);
    }
  }
}
function lightLeaks(g, t, boost) {
  g.save(); g.globalCompositeOperation = 'screen';
  const leaks = [[0.1, 0.2, '255,190,130'], [0.9, 0.75, '255,215,160']];
  leaks.forEach(([x, y, col], i) => {
    const a = 0.045 + 0.16 * boost + 0.02 * Math.sin(t * 0.7 + i * 2);
    const cx = (x + 0.15 * Math.sin(t * 0.18 + i * 3)) * W, cy = (y + 0.08 * Math.cos(t * 0.22 + i)) * H;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.9); rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  });
  // orbes flous en avant-plan (parallaxe lente)
  const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const sp = BOKEH[i % 3], sx = r(), sy = r(), v = 0.01 + r() * 0.025, ph = r() * 6.28;
    const x = ((sx + t * v) % 1.2 - 0.1) * W, y = (sy * 1.1 - 0.05) * H + 30 * Math.sin(t * 0.4 + ph);
    g.globalAlpha = Math.max(0, 0.07 + 0.05 * Math.sin(t * 0.8 + ph) + 0.12 * boost);
    g.drawImage(sp, x - sp.width / 2, y - sp.height / 2);
  }
  g.restore();
}
let ALLCUES = [];
function renderFrame(t) {
  window.__t = t;
  const g = window.__g;
  g.reset();
  gFX.reset();
  const i = Math.max(0, S.findIndex((sc) => t >= sc.start && t < sc.start + sc.dur));
  const sc = S[i] || S[S.length - 1];
  const prev = S[i - 1], next = S[i + 1];
  let boost = 0;
  if (prev && t < sc.start + H2) {
    const k = seg(t, sc.start - H2, sc.start + H2); boost = Math.sin(Math.PI * k);
    drawScene(gA, prev, t); drawScene(gB, sc, t); compose(g, sc.trans, k, t);
  } else if (next && t > next.start - H2) {
    const k = seg(t, next.start - H2, next.start + H2); boost = Math.sin(Math.PI * k);
    drawScene(gA, sc, t); drawScene(gB, next, t); compose(g, next.trans, k, t);
  } else {
    drawScene(gA, sc, t); g.drawImage(SA, 0, 0);
  }
  lightLeaks(g, t, boost);
  bursts(t);
  // halo (bloom) des lumières et paillettes
  gBL.reset(); gBL.filter = 'blur(6px)'; gBL.drawImage(FXC, 0, 0, W / 4, H / 4);
  g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(FXC, 0, 0); g.globalAlpha = 0.9; g.drawImage(BLC, 0, 0, W, H); g.restore();
  grain(g, t);
  // fin : retour doux vers l'ivoire
  const fo = seg(t, DURATION - 0.7, DURATION);
  if (fo > 0) { g.fillStyle = `rgba(248,242,233,${fo})`; g.fillRect(0, 0, W, H); }
}

export async function boot(canvas) {
  canvas.width = W; canvas.height = H;
  window.__g = canvas.getContext('2d');
  await loadAll();
  prepare();
  initPost();
  // sons de transition ajoutés automatiquement selon le type
  const TSND = { zoom: [['whoosh', -0.35, 0.7, 0.45]], flash: [['chime', -0.02, 0, 0.5], ['impact', -0.02, 0, 0.25]], wipe: [['whoosh', -0.35, 0.8, 0.45], ['shimmer', -0.1, 0, 0.3]],
    flip: [['whoosh', -0.3, 0.5, 0.35], ['pop', 0, 0, 0.3]], iris: [['shimmer', -0.3, 0, 0.4]], slide: [['whoosh', -0.35, 0.6, 0.3]] };
  S.forEach((sc, i) => { if (i) (TSND[sc.trans] || []).forEach(([type, dt, dur, gain]) => sc.cues.push({ t: dt, type, dur: dur || undefined, gain, trans: true })); });
  const cues = S.flatMap((s) => s.cues.map((c) => ({ ...c, t: +(c.t + s.start).toFixed(3), seg: s.id })));
  ALLCUES = cues;
  return { renderFrame, duration: DURATION, fps: 30, clock: S.map((s) => ({ id: s.id, start: s.start, dur: s.dur })), segments: S.map((s) => ({ id: s.id, start: s.start, end: s.start + s.dur })), cues };
}

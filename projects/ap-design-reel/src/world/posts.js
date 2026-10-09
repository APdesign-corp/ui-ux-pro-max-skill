// Faux posts Reels/TikTok pour la séquence SCROLL : photo + texte incrusté + interface
// (cœur, commentaires, repost, partage, enregistrer, pseudo, légende). Crédits : assets/posts/CREDITS.md

// ordre choisi pour que la carte n° 11 (celle où le scroll s'arrête) soit la voiture
export const FEED = [
  { img: 'cat.png', handle: 'chat.du.quartier', pill: 'Mon chat quand je rentre à 2h du mat 😾', likes: '24,1 k', com: '512', rep: '1 203', cap: 'il me juge 💀 #chat #pov' },
  { img: 'ref-website.png', src: [0, 62, 506, 628], fit: 'contain', handle: 'studio.webdesign', likes: '910', com: '285', rep: '21', cap: 'Commente « PROJET » pour commencer #website #webdesign' },
  { img: 'rocket.jpg', handle: 'space.daily', pill: 'Décollage en direct 🚀🔥', likes: '51,2 k', com: '1 874', rep: '6 020', cap: 'le son est incroyable 🔊 #space' },
  { img: 'ref-car.png', src: [6, 6, 408, 728], handle: 'street.cars.edit', likes: '8 599', com: '80', rep: '375', cap: 'random car edit 🔥 #bmw #m3' },
  { img: 'coffee.png', handle: 'cafe.addict', big: ['LATTE ART', 'niveau débutant ☕'], bigColor: '#ffd84d', likes: '3 456', com: '98', rep: '41', cap: 'on progresse 😅 #coffee #barista' },
  { img: 'hubble.jpg', handle: 'univers.fact', big: ['TU ES ICI 👇', '13 milliards d’années-lumière'], bigColor: '#ffffff', likes: '12,9 k', com: '344', rep: '2 101', cap: 'ça fait réfléchir 🤯 #espace' },
  { img: 'shot-1.95.png', handle: 'tech.leaks', pill: 'Le smartphone du futur ? 👀', likes: '7 812', com: '230', rep: '96', cap: 'vous en pensez quoi ? #tech' },
  { img: 'shot-2.95.png', handle: 'unboxing.fr', pill: 'Unboxing casque à 500€ 🎧 ça vaut le coup ?', likes: '2 304', com: '77', rep: '18', cap: 'avis honnête #unboxing' },
];

const FONT = '"Space Grotesk", "Noto Color Emoji", system-ui, sans-serif';

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

function wrap(g, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// icônes d'interface (trait blanc)
const ICON = {
  heart(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.75, x, y - s * 0.3);
    g.bezierCurveTo(x + s * 0.45, y - s * 0.75, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
    g.stroke();
  },
  comment(g, x, y, s) {
    g.beginPath(); g.arc(x, y - s * 0.05, s * 0.42, Math.PI * 0.75, Math.PI * 2.55); g.lineTo(x - s * 0.42, y + s * 0.38); g.closePath(); g.stroke();
  },
  repost(g, x, y, s) {
    g.beginPath(); g.moveTo(x - s * 0.4, y + s * 0.05); g.lineTo(x - s * 0.4, y - s * 0.2); g.lineTo(x + s * 0.3, y - s * 0.2); g.stroke();
    g.beginPath(); g.moveTo(x + s * 0.15, y - s * 0.35); g.lineTo(x + s * 0.32, y - s * 0.2); g.lineTo(x + s * 0.15, y - s * 0.05); g.stroke();
    g.beginPath(); g.moveTo(x + s * 0.4, y - s * 0.05); g.lineTo(x + s * 0.4, y + s * 0.2); g.lineTo(x - s * 0.3, y + s * 0.2); g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.15, y + s * 0.05); g.lineTo(x - s * 0.32, y + s * 0.2); g.lineTo(x - s * 0.15, y + s * 0.35); g.stroke();
  },
  share(g, x, y, s) {
    g.beginPath(); g.moveTo(x - s * 0.45, y - s * 0.35); g.lineTo(x + s * 0.45, y - s * 0.35); g.lineTo(x - s * 0.05, y + s * 0.42); g.lineTo(x - s * 0.15, y - s * 0.05); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.15, y - s * 0.05); g.lineTo(x + s * 0.45, y - s * 0.35); g.stroke();
  },
  save(g, x, y, s) {
    g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.4); g.lineTo(x + s * 0.3, y - s * 0.4); g.lineTo(x + s * 0.3, y + s * 0.42); g.lineTo(x, y + s * 0.15); g.lineTo(x - s * 0.3, y + s * 0.42); g.closePath(); g.stroke();
  },
};

/** Dessine un post complet dans un canvas w×h (9:16). */
export function drawPost(g, w, h, p, img) {
  g.save();
  rr(g, 0, 0, w, h, 26);
  g.clip();
  g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
  if (img) {
    const [sx, sy, sw, sh] = p.src || [0, 0, img.naturalWidth, img.naturalHeight];
    const cover = Math.max(w / sw, h / sh), contain = Math.min(w / sw, h / sh);
    if (p.fit === 'contain') {
      // fond flouté comme dans l'app, image entière au centre
      g.save(); g.filter = 'blur(22px) brightness(0.55)';
      g.drawImage(img, sx, sy, sw, sh, (w - sw * cover) / 2, (h - sh * cover) / 2, sw * cover, sh * cover);
      g.restore();
      g.drawImage(img, sx, sy, sw, sh, (w - sw * contain) / 2, (h - sh * contain) / 2, sw * contain, sh * contain);
    } else {
      g.drawImage(img, sx, sy, sw, sh, (w - sw * cover) / 2, (h - sh * cover) / 2, sw * cover, sh * cover);
    }
  }
  // dégradés de lisibilité haut / bas
  let gr = g.createLinearGradient(0, h * 0.62, 0, h);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)');
  g.fillStyle = gr; g.fillRect(0, h * 0.62, w, h * 0.38);
  gr = g.createLinearGradient(0, 0, 0, h * 0.18);
  gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.18);
  g.textBaseline = 'alphabetic';

  // texte incrusté : pastille noire (style « Websites in 2026 ») ou gros titre (style « RANDOM CAR EDIT »)
  if (p.pill) {
    g.font = `700 34px ${FONT}`;
    const lines = wrap(g, p.pill, w * 0.78);
    const lh = 44, pw = Math.max(...lines.map((l) => g.measureText(l).width)) + 44, ph = lines.length * lh + 26;
    const px = (w - pw) / 2, py = h * 0.13;
    g.fillStyle = 'rgba(0,0,0,0.88)'; rr(g, px, py, pw, ph, 14); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, w / 2, py + 13 + lh * (i + 0.78)));
  }
  if (p.big) {
    g.textAlign = 'center';
    g.font = `italic 700 66px ${FONT}`;
    g.fillStyle = p.bigColor; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14;
    g.fillText(p.big[0], w * 0.47, h * 0.6);
    g.font = `500 30px ${FONT}`; g.fillStyle = '#fff';
    g.fillText(p.big[1], w * 0.47, h * 0.6 + 46);
    g.shadowBlur = 0;
  }

  // colonne d'actions à droite
  const cx = w - 48;
  let y = h * 0.5;
  g.strokeStyle = '#fff'; g.lineWidth = 3.4; g.lineJoin = 'round'; g.lineCap = 'round';
  g.font = `500 19px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'center';
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 6;
  for (const [ic, n] of [['heart', p.likes], ['comment', p.com], ['repost', p.rep], ['share', ''], ['save', '']]) {
    ICON[ic](g, cx, y, 40);
    if (n) g.fillText(n, cx, y + 44);
    y += n ? 92 : 74;
  }
  g.beginPath(); for (const d of [-10, 0, 10]) g.arc(cx + d, y, 3, 0, Math.PI * 2); g.fill();

  // pseudo + suivre + légende
  const by = h - 112;
  g.beginPath(); g.arc(46, by, 22, 0, Math.PI * 2);
  const av = g.createLinearGradient(24, by - 22, 68, by + 22);
  av.addColorStop(0, '#f9ce34'); av.addColorStop(0.5, '#ee2a7b'); av.addColorStop(1, '#6228d7');
  g.fillStyle = av; g.fill();
  g.textAlign = 'left'; g.fillStyle = '#fff';
  g.font = `700 23px ${FONT}`;
  g.fillText(p.handle, 80, by + 8);
  const hw = g.measureText(p.handle).width;
  g.lineWidth = 2; rr(g, 80 + hw + 14, by - 18, 86, 34, 9); g.stroke();
  g.font = `600 19px ${FONT}`; g.fillText('Suivre', 80 + hw + 26, by + 6);
  g.font = `400 21px ${FONT}`;
  wrap(g, p.cap, w - 130).slice(0, 2).forEach((l, i) => g.fillText(l, 26, by + 52 + i * 27));
  g.shadowBlur = 0;
  g.restore();
  // liseré
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; rr(g, 1.5, 1.5, w - 3, h - 3, 26); g.stroke();
}

export function loadFeedImages(base = 'assets/posts/') {
  return Promise.all(FEED.map((p) => new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = base + p.img;
  })));
}

// Kit typographique / interface XAU PRÉCISION (or, argent, noir ; bleu = position acheteuse).
import { E, clamp, lerp, seg, TAU, noise1 } from '../core/anim.js';
import { setFont, textWidth, fitSize } from '../core/draw.js';

export const G = {
  gold: '#f2c14e', gold2: '#ffe08a', goldDeep: '#a8741c', silver: '#e6e8ec', white: '#f5f3ee', muted: '#9a9aa2',
  blue: '#2f9bff', red: '#e0343a', bg: '#050505',
};

/** Dégradé or (métal brossé) pour un texte de hauteur size centré sur y. */
export function goldFill(g, y, size, silver = false) {
  const gr = g.createLinearGradient(0, y - size, 0, y + size * 0.2);
  if (silver) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#d8dbe0'); gr.addColorStop(0.55, '#9ea3ab'); gr.addColorStop(1, '#f2f3f5'); }
  else { gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.42, '#f2c14e'); gr.addColorStop(0.58, '#b07a1e'); gr.addColorStop(1, '#ffe08a'); }
  return gr;
}

/**
 * Texte riche : parts = [[texte, style]] style ∈ 'w' (blanc), 'g' (or), 's' (argent), 'b' (bleu), 'm' (gris).
 * o = { size, weight, align, a, k (apparition 0→1 : montée masquée), maxW, tracking, glow }
 */
export function rich(g, parts, x, y, o = {}) {
  let size = o.size || 60;
  const weight = o.weight || 800, tr = o.tracking ?? -0.01;
  const total = () => parts.reduce((s, [t, st]) => s + textWidth(g, t, size, st === 'l' ? 300 : weight, tr) + (t.endsWith(' ') ? size * 0.22 : 0), 0);
  let w = total();
  if (o.maxW && w > o.maxW) { size *= o.maxW / w; w = total(); }
  const k = clamp(o.k ?? 1), a = (o.a ?? 1) * clamp(k * 1.5);
  if (a <= 0.003) return { w, size };
  let x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  g.save();
  g.globalAlpha *= a;
  // montée masquée
  g.beginPath(); g.rect(x0 - size, y - size * 1.15, w + size * 2, size * 1.45); g.clip();
  const dy = (1 - E.outExpo(k)) * size * 1.1;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  for (const [t, st] of parts) {
    const wt = st === 'l' ? 300 : weight;
    setFont(g, size, wt, tr);
    const tw = textWidth(g, t, size, wt, tr);
    g.fillStyle = st === 'g' ? goldFill(g, y + dy, size) : st === 's' ? goldFill(g, y + dy, size, true) : st === 'b' ? G.blue : st === 'm' ? G.muted : st === 'r' ? G.red : G.white;
    if (o.glow && (st === 'g' || st === 'b')) { g.shadowColor = st === 'b' ? 'rgba(47,155,255,0.6)' : 'rgba(242,193,78,0.55)'; g.shadowBlur = size * 0.35 * o.glow; } else g.shadowBlur = 0;
    g.fillText(t, x0, y + dy);
    x0 += tw + (t.endsWith(' ') ? size * 0.22 : 0);
  }
  g.restore();
  return { w, size };
}

/** Petit sur-titre espacé avec tiret or. */
export function eyebrow(g, str, x, y, size, k, align = 'center') {
  if (k <= 0) return;
  g.save();
  g.globalAlpha *= clamp(k * 1.5);
  const tr = lerp(0.6, 0.32, E.outExpo(k));
  const w = textWidth(g, str, size, 600, tr);
  const x0 = align === 'left' ? x : x - w / 2;
  setFont(g, size, 600, tr); g.fillStyle = G.gold; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(str, x0, y);
  g.fillStyle = G.gold; g.fillRect(x0, y + size * 0.45, w * E.outExpo(k) * 0.25, Math.max(2, size * 0.08));
  g.restore();
}

/** Carte verre fumé + liseré or (ticket d'ordre, encarts). */
export function glassCard(g, x, y, w, h, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const r = o.r ?? h * 0.12;
  g.save();
  g.globalAlpha *= a;
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  const bg = g.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, 'rgba(28,24,18,0.86)'); bg.addColorStop(1, 'rgba(8,8,10,0.9)');
  g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  const br = g.createLinearGradient(x, y, x + w, y + h);
  br.addColorStop(0, 'rgba(255,224,138,0.95)'); br.addColorStop(0.5, 'rgba(168,116,28,0.5)'); br.addColorStop(1, 'rgba(255,224,138,0.8)');
  g.strokeStyle = o.border || br; g.lineWidth = o.lw || 2.5; g.stroke();
  // reflet qui glisse
  if (o.sheen != null) {
    const sx = x + (o.sheen * 1.6 - 0.3) * w;
    g.save(); g.clip();
    const sg = g.createLinearGradient(sx - w * 0.2, y, sx + w * 0.2, y + h);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,240,200,0.12)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(x, y, w, h); g.restore();
  }
  g.restore();
}

/** Étiquette de prix (style plateforme) : pastille colorée + texte. */
export function priceTag(g, x, y, str, color, size, a = 1, align = 'left') {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= a;
  setFont(g, size, 700, 0.02);
  const w = textWidth(g, str, size, 700, 0.02) + size * 0.9, h = size * 1.55;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = size * 0.6;
  g.beginPath(); g.roundRect(x0, y - h / 2, w, h, size * 0.25); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = color === G.white || color === G.gold ? '#120d04' : '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, x0 + w / 2, y + size * 0.05);
  g.restore();
  return w;
}

/** Libellé ancré sur un point 3D (projeté) : point + trait + texte. */
export function anchorLabel(g, x, y, str, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const size = o.size || 30, side = o.side || 1, len = (o.len || 60) * E.outExpo(clamp(a * 1.3));
  g.save(); g.globalAlpha *= clamp(a);
  g.strokeStyle = o.color || G.gold; g.lineWidth = Math.max(1.5, size * 0.07);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + side * len, y - len * 0.5); g.lineTo(x + side * (len + size * 0.5), y - len * 0.5); g.stroke();
  g.fillStyle = o.color || G.gold; g.beginPath(); g.arc(x, y, size * 0.16, 0, TAU); g.fill();
  setFont(g, size, 700, 0.06); g.textBaseline = 'middle'; g.textAlign = side > 0 ? 'left' : 'right';
  g.fillStyle = o.text || G.white; g.fillText(str, x + side * (len + size * 0.7), y - len * 0.5);
  g.restore();
}

/** Format prix « 4017.56 » et euros « +359,20 € ». */
export const fmtP = (p) => p.toFixed(2);
export const fmtEur = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + ' €';

/** Bandeau voile sombre derrière un bloc de texte (lisibilité sur la 3D). */
export function veil(g, x, y, w, h, a = 0.6) {
  if (a <= 0) return;
  g.save();
  const gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.62);
  gr.addColorStop(0, `rgba(3,3,4,${a})`); gr.addColorStop(1, 'rgba(3,3,4,0)');
  g.fillStyle = gr; g.fillRect(x - w * 0.2, y - h * 0.4, w * 1.4, h * 1.8);
  g.restore();
}

/** Traits de vitesse dorés (calque fx). */
export function goldStreaks(g, W, H, t, k, seed = 1, dir = 1) {
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const h = Math.abs(noise1(i * 7.13 + seed)) % 1;
    const y = ((i * 0.618 + seed * 0.1) % 1) * H;
    const L = (0.15 + h * 0.4) * W * k;
    const x = (((t * (1.4 + h) * dir + i * 0.37) % 1.4) - 0.2) * W;
    const gr = g.createLinearGradient(x, y, x - L * dir, y);
    gr.addColorStop(0, `rgba(255,224,138,${0.5 * k})`); gr.addColorStop(1, 'rgba(255,224,138,0)');
    g.strokeStyle = gr; g.lineWidth = 1 + h * 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - L * dir, y); g.stroke();
  }
  g.restore();
}

export { fitSize, textWidth, setFont };

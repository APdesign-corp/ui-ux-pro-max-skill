// ============================================================================
//  01 — INTRO (0 → 3.5 s) : logo O'BINKS en IMPACT + TASTE THE DIFFERENCE
// ============================================================================
//  0.00  noir #0a0a0b + seedPoint au centre (= dernière image du film : boucle parfaite)
//  0.00  le point respire (riser) ; 0.30 / 0.46 les lampadaires rouges grésillent puis
//        s'allument (zap), la rue de nuit apparaît, fumée au sol
//  0.60  aspiration : la lumière converge vers le point d'impact, la rue s'assombrit
//  0.90  IMPACT : le logo s'écrase sur le mur, ÉCLABOUSSURE de peinture rouge (gouttes qui
//        volent vers la caméra, coulures), onde de choc, flash, glitch, étincelles, braises
//  1.50  trait de pinceau rouge → 1.60 « TASTE THE DIFFERENCE » (lettres qui claquent)
//  2.05  reflet qui balaie le logo ; 2.0 / 2.5 pulsations du halo néon sur les temps
//  3.00  la caméra plonge vers le logo, coups de pinceau rouges qui couvrent tout l'écran
//  3.50  plein rouge → raccord avec 02-crousty (les coups de pinceau s'y retirent)
// ============================================================================
import { E, clamp, lerp, seg, pulse, noise1, hash, rng, rgba, TAU } from '../core/anim.js';
import { seedPoint } from '../core/type.js';
import { P, brushStroke, splatter, brushTitle, smoke, streetBackdrop, streetLamp, particles, photo, paintWipe } from '../core/obinks.js';

const T_L = [0.3, 0.46], T_SUCK = 0.6, T_HIT = 0.9, T_BRUSH = 1.5, T_TXT = 1.6, T_GLINT = 2.05, T_WIPE = 3.0, T_END = 3.5;

export const cues = [
  { t: 0.0, type: 'riser', dur: 0.9, gain: 0.5 },
  { t: T_L[0], type: 'zap', gain: 0.7, pan: -0.7 },
  { t: T_L[1], type: 'zap', gain: 0.7, pan: 0.7 },
  { t: T_SUCK, type: 'suck', dur: T_HIT - T_SUCK, gain: 0.8 },
  { t: T_HIT, type: 'impact', gain: 1.3 },
  { t: T_HIT, type: 'splash', gain: 1.1 },
  { t: T_HIT + 0.01, type: 'sub', dur: 0.9, gain: 0.8 },
  { t: T_HIT + 0.03, type: 'glitch', gain: 0.8 },
  { t: T_BRUSH, type: 'swish', gain: 0.8 },
  { t: T_TXT + 0.02, type: 'hit', gain: 0.55 },
  { t: T_GLINT, type: 'flash', gain: 0.45 },
  { t: T_WIPE, type: 'whoosh', dur: 0.48, gain: 1 },
  { t: T_WIPE + 0.04, type: 'swish', gain: 0.7, pan: -0.6 },
  { t: T_WIPE + 0.2, type: 'swish', gain: 0.7, pan: 0.6 },
];

// point de lumière (même dessin que seedPoint, mais où l'on veut) : la « charge » avant l'impact
function energyPoint(g, x, y, k, u) {
  if (k <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const R = 110 * u * (0.8 + 0.4 * k);
  const glow = g.createRadialGradient(x, y, 0, x, y, R);
  glow.addColorStop(0, rgba(P.neon, Math.min(1, 0.5 * k)));
  glow.addColorStop(0.3, rgba(P.neon, Math.min(1, 0.16 * k)));
  glow.addColorStop(1, rgba(P.neon, 0));
  g.fillStyle = glow; g.fillRect(x - R, y - R, R * 2, R * 2);
  const r = 14 * u * (0.8 + 0.5 * k);
  const core = g.createRadialGradient(x, y, 0, x, y, r);
  core.addColorStop(0, rgba('#ffffff', Math.min(1, k)));
  core.addColorStop(0.5, rgba('#ffe0dc', Math.min(1, 0.7 * k)));
  core.addColorStop(1, rgba(P.neon, 0));
  g.fillStyle = core; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

// lampadaire qui grésille avant de s'allumer (0 / 1, déterministe)
const lampOn = (t, t0, seed) => {
  if (t < t0) return 0;
  const q = (t - t0) / 0.2;
  if (q >= 1) return 1;
  return hash(Math.floor(t * 40) * 1.73 + seed * 9.1) < 0.3 + 0.65 * q ? 1 : 0;
};

export default function create(ctx) {
  const { W, H, V, u, L, world, THREE } = ctx;
  const S = L.safe;
  const I = world.images || {};
  const group = new THREE.Group();
  group.name = 'intro';

  // ---------------- mise en page
  const logo = I.logo;
  const lw = V ? S.w * 0.82 : Math.min(W * 0.52, 1000 * u);
  const lh = logo ? (lw * logo.h) / logo.w : lw * 0.41;
  const cx = W / 2, cy = V ? H * 0.405 : H * 0.43;
  const slogan = V
    ? [{ s: 'TASTE THE', y: H * 0.585, size: 122 * u, p0: 0 }, { s: 'DIFFERENCE', y: H * 0.66, size: 122 * u, p0: 0.12 }]
    : [{ s: 'TASTE THE DIFFERENCE', y: H * 0.805, size: 100 * u, p0: 0 }];
  // lampadaires : positions (fractions de W), instant d'allumage
  const lamps = V
    ? [{ fx: 0.07, t0: T_L[0] }, { fx: 0.93, t0: T_L[1] }]
    : [{ fx: 0.07, t0: T_L[0] }, { fx: 0.29, t0: T_L[1] }, { fx: 0.71, t0: T_L[1] + 0.04 }, { fx: 0.93, t0: T_L[0] + 0.05 }];
  const hz = H * (V ? 0.8 : 0.76), lampH = (V ? 0.42 : 0.62) * H; // = géométrie de streetBackdrop
  // gouttes de peinture projetées vers la caméra
  const R = rng(77);
  const flyDrops = Array.from({ length: 9 }, () => ({ a: R() * TAU, sp: 0.6 + 0.9 * R(), r: 0.012 + 0.03 * R(), d0: 0.04 * R() }));

  // calque hors écran pour le reflet qui balaie le logo (créé une fois)
  const gl = document.createElement('canvas');
  gl.width = Math.max(2, Math.round(lw)); gl.height = Math.max(2, Math.round(lh));
  const glc = gl.getContext('2d', { willReadFrequently: true });

  return {
    group,
    camera() {
      return { pos: [0, 0, 5], target: [0, 0, 0], roll: 0, fov: 35 };
    },
    update(f) {
      const t = f.lt, bg = f.bg, ui = f.ui, fx = f.fx, post = f.post;

      // ---------------- « caméra » 2D : poussée lente, coup de bélier à l'impact, plongée finale,
      // tremblement des cues (f.shake)
      const zoom = (1 + 0.07 * E.inOutSine(seg(t, 0, T_WIPE))) * (1 - 0.05 * pulse(t, T_HIT, 0.012, 0.16)) * (1 + 0.32 * E.inCubic(seg(t, T_WIPE, T_END)));
      const shx = noise1(f.t * 31) * f.shake * 16 * u, shy = noise1(f.t * 29 + 9) * f.shake * 12 * u;
      const cam = (g, depth = 1) => {
        const z = 1 + (zoom - 1) * depth;
        g.translate(W / 2 + shx * depth, H / 2 + shy * depth);
        g.scale(z, z);
        g.translate(-W / 2, -H / 2);
      };

      // ---------------- fond : rue de nuit (k = 0 avant le premier lampadaire : noir pur)
      const street = t >= T_L[0] ? 1 : 0;
      const ons = lamps.map((l, i) => lampOn(t, l.t0, i + 1));
      const dim = 1 - 0.55 * E.inQuad(seg(t, T_SUCK, T_HIT)) + 0.5 * pulse(t, T_HIT, 0.01, 0.25);
      const beat = 0.12 * (pulse(t, 2.0, 0.02, 0.2) + pulse(t, 2.5, 0.02, 0.2));
      const par = t * 22 * u;
      if (street) {
        bg.save();
        cam(bg, 0.6);
        const lit = lamps.filter((_, i) => ons[i]).map((l) => l.fx);
        streetBackdrop(bg, W, H, f.t, { k: 1, lamps: lit.length ? lit : 0, light: dim + beat, parallax: par, seed: 2, flicker: 0.3 });
        // lampadaires encore éteints : silhouette sombre
        lamps.forEach((l, i) => { if (!ons[i]) streetLamp(bg, l.fx * W - par, hz + 6 * u, lampH, { on: 0, t: f.t }); });
        smoke(bg, W, H, f.t, { k: seg(t, T_L[0], 0.9), area: [0, H * 0.5, W, H * 0.5], size: Math.min(W, H) * 0.8, count: 10, alpha: 0.2, color: '#8a3a34', seed: 11, rise: 0.5 });
        // halo néon derrière le logo (après l'impact), pulse sur les temps
        const halo = seg(t, T_HIT, T_HIT + 0.3) * (0.8 + beat * 2);
        if (halo > 0) {
          bg.globalCompositeOperation = 'lighter';
          const hr = lw * 0.75;
          const hg = bg.createRadialGradient(cx, cy, 0, cx, cy, hr);
          hg.addColorStop(0, rgba(P.neon, 0.32 * halo)); hg.addColorStop(0.5, rgba(P.red, 0.12 * halo)); hg.addColorStop(1, rgba(P.red, 0));
          bg.fillStyle = hg; bg.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);
        }
        bg.restore();
      }

      // ---------------- la lueur : seedPoint (image 0) → charge qui monte au point d'impact
      if (t < T_HIT) {
        const breathe = 1 + 0.22 * Math.sin(t * 15);
        const toImpact = E.inOutCubic(seg(t, 0.42, 0.82));
        const charge = 1 + 2.4 * E.inCubic(seg(t, T_SUCK, T_HIT));
        if (toImpact <= 0) seedPoint(fx, W, H, breathe);
        else energyPoint(fx, cx, lerp(H / 2, cy, toImpact), breathe * charge, u);
        // aspiration : traits de lumière qui convergent
        const sk = seg(t, T_SUCK, T_HIT);
        if (sk > 0) {
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          fx.lineCap = 'round';
          const Rmax = Math.hypot(W, H) * 0.55;
          for (let i = 0; i < 46; i++) {
            const a = hash(i * 3.7) * TAU, d0 = hash(i * 9.1) * 0.25;
            const q = E.inQuad(clamp((sk - d0) / (1 - d0)));
            if (q <= 0 || q >= 1) continue;
            const d = Rmax * (1 - q), len = Rmax * 0.18 * (1 - q * 0.5);
            const x1 = cx + Math.cos(a) * d, y1 = cy + Math.sin(a) * d, x2 = cx + Math.cos(a) * (d + len), y2 = cy + Math.sin(a) * (d + len);
            const gr = fx.createLinearGradient(x1, y1, x2, y2);
            gr.addColorStop(0, rgba(i % 3 ? P.neon : '#ffffff', 0.8 * q)); gr.addColorStop(1, rgba(P.neon, 0));
            fx.strokeStyle = gr; fx.lineWidth = (1.5 + 2.5 * hash(i * 1.3)) * u;
            fx.beginPath(); fx.moveTo(x1, y1); fx.lineTo(x2, y2); fx.stroke();
          }
          fx.restore();
        }
      }

      // ---------------- particules : étincelles de l'impact + braises ambiantes
      particles(fx, W, H, f.t, { kind: 'sparks', burst: { x: cx, y: cy, t0: T_HIT, power: 1.5 }, seed: 3, count: 80 });
      particles(fx, W, H, f.t, { kind: 'sparks', burst: { x: cx - lw * 0.3, y: cy + lh * 0.1, t0: T_HIT + 0.04, power: 0.9 }, seed: 5, count: 30 });
      particles(fx, W, H, f.t, { kind: 'embers', k: seg(t, T_HIT, T_HIT + 0.5), area: [0, H * 0.25, W, H * 0.75], count: V ? 40 : 54, seed: 7 });

      // ---------------- peinture + logo (calque net, caméra 2D)
      ui.save();
      cam(ui, 1);
      if (t >= T_HIT) {
        const sp = seg(t, T_HIT, T_HIT + 1.1);
        splatter(ui, cx - lw * 0.36, cy + lh * 0.18, lw * 0.17, { p: seg(t, T_HIT + 0.05, T_HIT + 1.0), seed: 12, drips: 1.2 });
        splatter(ui, cx + lw * 0.38, cy - lh * 0.22, lw * 0.13, { p: seg(t, T_HIT + 0.08, T_HIT + 1.0), seed: 15, drips: 0.8 });
        splatter(ui, cx, cy + lh * 0.04, lw * 0.5, { p: sp, seed: 4, drips: 1.1 });
      }
      // logo : arrive de la caméra (énorme, flou), s'écrase, rebondit, respire
      if (logo && t >= T_HIT - 0.12) {
        const fly = seg(t, T_HIT - 0.12, T_HIT);
        const sc0 = lerp(3.4, 1, E.inQuad(fly));
        const d = t - T_HIT;
        const wob = d >= 0 ? Math.exp(-d / 0.12) * Math.cos(d * 42) : 0;
        const bump = 0.025 * (pulse(t, 2.0, 0.015, 0.14) + pulse(t, 2.5, 0.015, 0.14));
        const sc = sc0 * (1 + 0.04 * E.outCubic(seg(t, T_HIT + 0.2, T_WIPE))) * (1 + bump);
        const sx = sc * (1 + 0.1 * wob), sy = sc * (1 - 0.09 * wob);
        ui.save();
        ui.translate(cx, cy);
        ui.rotate((1 - E.inQuad(fly)) * -0.12 + 0.012 * wob);
        ui.scale(sx, sy);
        ui.globalAlpha = clamp(fly * 2.2);
        photo(ui, logo, 0, 0, { w: lw, glow: 0.55 + 0.5 * pulse(t, T_HIT, 0.01, 0.3) + beat * 2, glowColor: P.neon });
        // reflet qui balaie (lumière sur le lettrage)
        const gk = seg(t, T_GLINT, T_GLINT + 0.42);
        if (gk > 0 && gk < 1) {
          glc.setTransform(1, 0, 0, 1, 0, 0);
          glc.globalCompositeOperation = 'source-over';
          glc.clearRect(0, 0, gl.width, gl.height);
          glc.drawImage(logo.img, 0, 0, gl.width, gl.height);
          glc.globalCompositeOperation = 'source-in';
          const gx = lerp(-0.35, 1.35, E.inOutCubic(gk)) * gl.width;
          const gg = glc.createLinearGradient(gx - gl.width * 0.14, 0, gx + gl.width * 0.14, gl.height * 0.4);
          gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,245,235,0.85)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
          glc.fillStyle = gg; glc.fillRect(0, 0, gl.width, gl.height);
          ui.globalCompositeOperation = 'lighter';
          ui.drawImage(gl, -lw / 2, -lh / 2, lw, lh);
          ui.globalCompositeOperation = 'source-over';
        }
        ui.restore();
      }
      // gouttes de peinture qui volent vers la caméra (grossissent, sortent du cadre)
      if (t >= T_HIT && t < T_HIT + 0.45) {
        ui.save();
        for (const d of flyDrops) {
          const q = seg(t, T_HIT + d.d0, T_HIT + d.d0 + 0.32);
          if (q <= 0 || q >= 1) continue;
          const e = E.outQuad(q);
          const dist = e * Math.hypot(W, H) * 0.55 * d.sp;
          const x = cx + Math.cos(d.a) * dist, y = cy + Math.sin(d.a) * dist * 0.8;
          const r = Math.min(W, H) * d.r * (1 + 5 * e * e);
          // goutte hors du plan de netteté : cœur rouge, bord flou, petit reflet
          ui.globalAlpha = 0.92 * (1 - E.inQuad(q));
          const dg = ui.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r * 1.3);
          dg.addColorStop(0, '#ff3a30'); dg.addColorStop(0.55, P.red); dg.addColorStop(0.8, rgba(P.deep, 0.85)); dg.addColorStop(1, rgba(P.deep, 0));
          ui.fillStyle = dg;
          ui.beginPath(); ui.ellipse(x, y, r * 1.3 * 1.2, r * 1.3, d.a, 0, TAU); ui.fill();
          ui.fillStyle = 'rgba(255,200,190,0.35)';
          ui.beginPath(); ui.ellipse(x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.16, -0.6, 0, TAU); ui.fill();
        }
        ui.restore();
      }
      // ---------------- TASTE THE DIFFERENCE : trait de pinceau rouge + lettres brush
      slogan.forEach((ln, i) => {
        const bp = seg(t, T_BRUSH + ln.p0 * 0.8, T_BRUSH + ln.p0 * 0.8 + 0.22);
        if (bp <= 0) return;
        ui.font = `400 ${ln.size}px "Permanent Marker"`;
        const tw = Math.min(ui.measureText(ln.s).width, S.w);
        brushStroke(ui, cx + (i % 2 ? 14 : -10) * u, ln.y - ln.size * 0.3, tw * 1.22, ln.size * 1.32, { p: E.outCubic(bp), seed: 2 + i, color: P.red, angle: -0.035 + i * 0.02 });
        brushTitle(ui, ln.s, cx, ln.y, { size: ln.size, p: seg(t, T_TXT + ln.p0, T_TXT + ln.p0 + 0.36), maxWidth: S.w, glow: 0.35, rotate: -0.03, stroke: ln.size * 0.09 });
      });
      ui.restore();

      // ---------------- transition : coups de pinceau rouges qui couvrent tout (plein rouge à 3.48 s)
      paintWipe(ui, W, H, seg(t, T_WIPE, T_END - 0.02), { seed: 5, angle: -0.07 });

      // ---------------- post
      const hk = t >= T_HIT ? 1 : 0;
      post.flash = Math.max(post.flash, pulse(t, T_HIT, 0.012, 0.045) * 0.5 * hk);
      post.flashColor = [1, 0.5, 0.42];
      if (t >= T_HIT && t < T_HIT + 0.6) {
        const q = seg(t, T_HIT, T_HIT + 0.6);
        post.shock = [cx / W, 1 - cy / H, E.outCubic(q) * 1.5, 1.4 * (1 - q)];
      }
      if (t > T_HIT - 0.12 && t < T_HIT + 0.05) { post.zoomBlur = -0.16 * seg(t, T_HIT - 0.12, T_HIT); post.zoomCenter = [cx / W, 1 - cy / H]; }
      if (t > T_WIPE) { post.zoomBlur = 0.09 * E.inCubic(seg(t, T_WIPE, T_END)); post.zoomCenter = [0.5, 1 - cy / H]; }
      post.rgb = Math.max(post.rgb, pulse(t, T_HIT, 0.01, 0.1) * 0.006);
      post.ca += pulse(t, T_HIT, 0.01, 0.2) * 0.004;
      // avant la rue : réglages par défaut (image 0 identique à la dernière image du film)
      if (t >= T_L[0] - 0.05) { post.bloom = 0.62; post.vignette = 1.2; }
    },
  };
}

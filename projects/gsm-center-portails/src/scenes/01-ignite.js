// SEGMENT « ignite » (0 → 2 s) — noir, point de lumière qui respire et aspire des étincelles,
// éclair fractal, IMPACT : onde de choc, flash, « GSM CENTER » géant qui jaillit du point en
// lettres découpées (fausse 3D perspective), rayons, flare, studio qui s'allume ; puis les
// lettres explosent VERS la caméra pendant que des points lumineux apparaissent en profondeur
// (ce sont les téléphones du segment orbit : même trajectoire de caméra, voir 02-orbit-rig.js).

import { E, clamp, lerp, seg, pulse, noise1, rng, rgba, hash, TAU } from '../core/anim.js';
import { setFont, fitSize, charLayout, radialGlow, flare, streak, sparks, shockRing, drawText, textWidth } from '../core/draw.js';
import { C, seedPoint, speedLines } from '../core/type.js';
import { makeRig, buildStage } from './02-orbit-rig.js';

const T_STRIKE = 0.6;   // éclair
const T_IMPACT = 0.75;  // impact (titre)
const T_BOOM = 1.8;     // explosion des lettres vers la caméra

export const cues = [
  { t: 0.0, type: 'riser', dur: 0.75, gain: 0.85 },   // montée jusqu'à l'impact
  { t: 0.42, type: 'suck', dur: 0.33, gain: 1.0 },    // aspiration inversée
  { t: 0.6, type: 'zap', gain: 1.2 },                 // éclair principal
  { t: 0.66, type: 'zap', gain: 0.7, pan: -0.5 },
  { t: 0.7, type: 'zap', gain: 0.6, pan: 0.5 },
  { t: 0.75, type: 'impact', gain: 1.3 },             // IMPACT : titre + onde de choc
  { t: 0.75, type: 'sub', dur: 1.0, gain: 0.8 },
  { t: 0.77, type: 'glitch', gain: 0.6 },
  { t: 1.0, type: 'tick', gain: 0.5 },                // LIÈGE
  { t: 1.04, type: 'scan', gain: 0.5 },               // balayage lumineux du titre
  { t: 1.5, type: 'swish', gain: 0.4, pan: 0.3 },     // second reflet (retour)
  { t: 1.5, type: 'riser', dur: 0.5, gain: 0.7 },     // pic à 2.0 (hit d'orbit)
  { t: 1.78, type: 'whoosh', dur: 0.35, gain: 1.2 },  // lettres qui explosent vers la caméra
  { t: 1.8, type: 'reverse', dur: 0.2, gain: 0.5 },
];

// ------------------------------------------------------------------ éclair fractal
function boltPath(x1, y1, x2, y2, r, depth, rough) {
  let pts = [[x1, y1], [x2, y2]];
  for (let d = 0; d < depth; d++) {
    const np = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const off = (r() - 0.5) * len * rough;
      np.push([(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off], b);
    }
    pts = np;
  }
  return pts;
}

function makeBolt(x1, y1, x2, y2, seed, o = {}) {
  const r = rng(seed);
  const main = boltPath(x1, y1, x2, y2, r, o.depth ?? 7, o.rough ?? 0.55);
  const branches = [];
  const total = Math.hypot(x2 - x1, y2 - y1);
  const nb = o.branches ?? 6;
  for (let b = 0; b < nb; b++) {
    const idx = Math.floor((0.08 + r() * 0.75) * (main.length - 1));
    const a = main[idx], nx = main[Math.min(main.length - 1, idx + 3)];
    const ang = Math.atan2(nx[1] - a[1], nx[0] - a[0]) + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.6);
    const len = total * (0.12 + r() * 0.22);
    const pts = boltPath(a[0], a[1], a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len, r, 5, 0.6);
    branches.push({ idx, pts, w: 0.45 + r() * 0.25 });
    if (r() < 0.5) {
      const j = Math.floor(pts.length * (0.3 + r() * 0.4));
      const p = pts[j], ang2 = ang + (r() - 0.5) * 1.6, l2 = len * (0.3 + r() * 0.3);
      branches.push({ idx, pts: boltPath(p[0], p[1], p[0] + Math.cos(ang2) * l2, p[1] + Math.sin(ang2) * l2, r, 4, 0.6), w: 0.3 });
    }
  }
  return { main, branches };
}

function strokePts(g, pts, n) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}

function drawBolt(g, bolt, prog, width, alpha) {
  if (alpha <= 0.01 || prog <= 0) return;
  const n = Math.max(2, Math.min(bolt.main.length, Math.ceil(bolt.main.length * prog)));
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const passes = [[7, C.neon, 0.13], [2.8, C.neon2, 0.5], [1, '#ffffff', 0.95]];
  for (const [mul, col, a] of passes) {
    g.strokeStyle = rgba(col, a * alpha);
    g.lineWidth = width * mul;
    strokePts(g, bolt.main, n);
    for (const b of bolt.branches) {
      if (b.idx >= n) continue;
      g.lineWidth = width * mul * b.w;
      strokePts(g, b.pts, Math.max(2, Math.ceil(b.pts.length * clamp((prog * bolt.main.length - b.idx) / 12))));
    }
  }
  g.restore();
}

// ------------------------------------------------------------------ titre (mise en page)
function buildTitle(g, ctx) {
  const { W, H, V, u, L } = ctx;
  const S = L.safe;
  const letters = [];
  const cap = (size, wt) => {
    setFont(g, size, wt, 0);
    return g.measureText('GSMCENTR').actualBoundingBoxAscent || size * 0.7;
  };
  let lie, width, top, bottom;
  if (!V) {
    const str = 'GSM CENTER', wt = 900, tr = -0.012;
    const size = fitSize(g, str, wt, tr, S.w * 0.8, 1200 * u);
    const lay = charLayout(g, str, size, wt, tr);
    const ch = cap(size, wt);
    lay.chars.forEach((c, i) => {
      if (c.ch === ' ') return;
      letters.push({ ch: c.ch, size, wt, x: -lay.width / 2 + c.x + c.w / 2, y: 0, w: c.w, cap: ch, color: i < 3 ? C.white : C.neon });
    });
    width = lay.width;
    top = -ch / 2;
    bottom = ch / 2;
    lie = { size: Math.round(size * 0.25), y: ch / 2 + size * 0.45, line: width };
  } else {
    const wt = 900;
    const s1 = fitSize(g, 'GSM', wt, -0.02, S.w * 0.86, 3000 * u);
    const s2 = fitSize(g, 'CENTER', wt, -0.015, S.w * 0.86, 3000 * u);
    const c1 = cap(s1, wt), c2 = cap(s2, wt), gap = s2 * 0.2;
    const block = c1 + gap + c2;
    const y1 = -block / 2 + c1 / 2, y2 = block / 2 - c2 / 2;
    const l1 = charLayout(g, 'GSM', s1, wt, -0.02), l2 = charLayout(g, 'CENTER', s2, wt, -0.015);
    l1.chars.forEach((c) => letters.push({ ch: c.ch, size: s1, wt, x: -l1.width / 2 + c.x + c.w / 2, y: y1, w: c.w, cap: c1, color: C.white }));
    l2.chars.forEach((c) => letters.push({ ch: c.ch, size: s2, wt, x: -l2.width / 2 + c.x + c.w / 2, y: y2, w: c.w, cap: c2, color: C.neon }));
    width = Math.max(l1.width, l2.width);
    top = -block / 2;
    bottom = block / 2;
    lie = { size: Math.round(s2 * 0.3), y: block / 2 + s2 * 0.62, line: width };
  }
  const maxR = Math.max(...letters.map((l) => Math.hypot(l.x, l.y * 1.5))) || 1;
  const r = rng(404);
  letters.forEach((l, i) => {
    l.delay = 0.055 * (Math.hypot(l.x, l.y * 1.5) / maxR) + r() * 0.015;
    l.roll = (r() - 0.5) * 1.6;
    l.boomDelay = r() * 0.05;
    l.boomRoll = (r() - 0.5) * 2.4;
    l.boomDx = (r() - 0.5) * 0.9;
    l.boomDy = (r() - 0.5) * 0.9;
    l.i = i;
  });
  return { letters, lie, width, top, bottom, maxR };
}

export default function create(ctx) {
  const { THREE, W, H, V, u, L, cfg } = ctx;
  const rig = makeRig(V);
  const group = new THREE.Group();
  const stage = buildStage(ctx);
  group.add(stage.root);

  const g0 = ctx.engine.ui;
  const TT = buildTitle(g0, ctx);
  const cx = W / 2, cy = H / 2;
  const F = 1.25 * Math.max(W, H);           // focale de la fausse 3D du titre
  const diag = Math.hypot(W, H) / 2;
  const pk = cfg.vfx.particles;

  // ---- particules qui convergent vers le point (0 → 0.68 s)
  const rC = rng(17);
  const conv = Array.from({ length: Math.round(170 * pk) }, () => ({
    a0: rC() * TAU,
    r0: (0.3 + rC() * 0.75) * diag,
    ts: 0.02 + rC() * 0.42,
    dur: 0.2 + rC() * 0.26,
    swirl: (rC() - 0.5) * 1.8,
    w: 0.8 + rC() * 2,
    white: rC() < 0.25,
  }));
  // ---- braises après l'impact
  const rB = rng(29);
  const embers = Array.from({ length: Math.round(80 * pk) }, () => ({
    a: rB() * TAU, v: (120 + rB() * 620) * u, life: 0.5 + rB() * 0.9, up: (20 + rB() * 90) * u,
    s: 1 + rB() * 2.6, ph: rB() * 50, flat: V ? 1 : 0.55,
  }));
  // ---- rayons derrière le titre
  const rR = rng(51);
  const rays = Array.from({ length: 30 }, () => ({ a: rR() * TAU, w: 0.006 + rR() * 0.03, len: 0.55 + rR() * 0.6, ph: rR() * 20, k: 0.4 + rR() * 0.6 }));

  // ---- état des lettres au temps lt (calculé une fois par image)
  const state = TT.letters.map(() => ({ x: 0, y: 0, sx: 1, sy: 1, rot: 0, a: 0, hot: 0, s: 1 }));
  function letterStates(lt) {
    const yaw = lerp(0.34, -0.12, E.outCubic(seg(lt, T_IMPACT, T_IMPACT + 0.55))) + 0.24 * E.inOutSine(seg(lt, 1.1, 1.95));
    const pitch = lerp(-0.3, 0.05, E.outCubic(seg(lt, T_IMPACT, T_IMPACT + 0.5))) - 0.1 * E.inOutSine(seg(lt, 1.1, 1.95));
    const zG = -0.1 * F * E.inOutSine(seg(lt, 0.95, T_BOOM + 0.05));
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (let i = 0; i < TT.letters.length; i++) {
      const l = TT.letters[i], o = state[i];
      const a0 = T_IMPACT + l.delay;
      const p = seg(lt, a0, a0 + 0.22);
      if (lt < a0) { o.a = 0; continue; }
      // vol depuis le point (très loin) jusqu'à sa place, petit rebond
      let z = 9 * F * (1 - E.outExpo(p)) + zG;
      const bump = Math.sin(Math.PI * seg(lt, a0 + 0.08, a0 + 0.42)) * 0.07;
      let x = l.x, y = l.y, rot = l.roll * (1 - E.outCubic(p));
      // explosion vers la caméra
      const e = E.inCubic(seg(lt, T_BOOM + l.boomDelay, 1.985));
      if (e > 0) {
        z -= 0.93 * F * e;
        x += l.boomDx * e * TT.maxR * 0.6;
        y += l.boomDy * e * TT.maxR * 0.6;
        rot += l.boomRoll * e;
      }
      // plan du titre tourné (yaw, pitch) + perspective
      const x1 = x * cyw, z1 = -x * syw;
      const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + z;
      const s = (F / Math.max(F * 0.03, F + z2)) * (1 + bump);
      o.x = cx + x1 * s;
      o.y = cy + y1 * s;
      o.sx = s * cyw;
      o.sy = s * cp;
      o.s = s;
      o.rot = rot;
      o.a = clamp(p * 5) * (1 - E.inQuad(seg(e, 0.35, 0.97)));
      o.hot = 1 - E.outCubic(seg(lt, a0 + 0.04, a0 + 0.3));
      o.e = e;
    }
    return { zG, sG: F / (F + zG) };
  }
  function drawLetters(g, mode, k = 1) {
    for (let i = 0; i < TT.letters.length; i++) {
      const l = TT.letters[i], o = state[i];
      if (o.a <= 0.003) continue;
      g.save();
      g.translate(o.x, o.y);
      g.rotate(o.rot);
      g.scale(o.sx, o.sy);
      setFont(g, l.size, l.wt, 0);
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      if (mode === 'ui') {
        g.globalAlpha = o.a;
        g.fillStyle = l.color;
        g.fillText(l.ch, -l.w / 2, l.cap / 2);
        if (o.hot > 0.01) {
          g.globalAlpha = o.a * o.hot;
          g.fillStyle = '#ffffff';
          g.fillText(l.ch, -l.w / 2, l.cap / 2);
        }
      } else {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = clamp(o.a * k * (0.2 + 0.8 * o.hot));
        g.fillStyle = l.color === C.white ? '#dfffe0' : C.neon;
        g.fillText(l.ch, -l.w / 2, l.cap / 2);
      }
      g.restore();
    }
  }

  return {
    group,
    camera(lt) {
      return rig.cam(lt - 2);
    },
    update(f) {
      const lt = f.lt;
      const { fx, ui, post, world } = f;
      const imp = lt >= T_IMPACT;
      const tau = lt - T_IMPACT;
      const reveal = E.outCubic(seg(lt, T_IMPACT, T_IMPACT + 0.45)); // studio qui s'allume
      const boom = seg(lt, T_BOOM - 0.05, 2.0);

      // ------------------------------------------------------------- 3D : studio dans la brume
      const pre = seg(lt, 0, 0.7);
      world.studio.update(f.t, {
        backdrop: false, grid: 0, beams: 0.3 * reveal - 0.18 * seg(lt, 1.6, 2.0), dust: 0.35 * pre + 0.8 * reveal, motes: 0.25 * pre + 1.0 * reveal,
        env: 1, rim: 1, key: 1, glow: 1,
      });
      stage.update({
        t: f.t, bg: 0.12 * pre * (1 - reveal) + 0.32 * reveal - 0.1 * seg(lt, 1.6, 2.0), tubes: 0.7 + 0.3 * seg(lt, 1.6, 2.0),
        tubesOn: seg(lt, T_IMPACT + 0.02, 1.2), grid: (V ? 0.4 : 0.55) * reveal, haze: 0.5 * reveal, bgCenter: [0.5, 0.5],
      });

      // ------------------------------------------------------------- avant l'impact
      // rayons derrière le titre (dessinés d'abord : ils passent derrière les lettres)
      const rk = imp ? E.outCubic(seg(tau, 0, 0.12)) * (1 - 0.45 * seg(lt, 1.1, 1.75)) * (1 - boom) : 0;
      if (rk > 0.003) {
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        fx.translate(cx, cy);
        fx.rotate(lt * 0.16);
        const R = diag * 1.25;
        for (const ry of rays) {
          const fl = ry.k * (0.55 + 0.45 * noise1(lt * 3.5 + ry.ph)) * rk;
          if (fl <= 0.01) continue;
          const grd = fx.createRadialGradient(0, 0, 0, 0, 0, R * ry.len);
          grd.addColorStop(0, rgba(C.neon, 0));
          grd.addColorStop(0.1, rgba(C.neon2, 0.13 * fl));
          grd.addColorStop(0.45, rgba(C.neon, 0.04 * fl));
          grd.addColorStop(1, rgba(C.neon, 0));
          fx.fillStyle = grd;
          fx.beginPath();
          fx.moveTo(0, 0);
          fx.lineTo(Math.cos(ry.a - ry.w) * R, Math.sin(ry.a - ry.w) * R);
          fx.lineTo(Math.cos(ry.a + ry.w) * R, Math.sin(ry.a + ry.w) * R);
          fx.closePath();
          fx.fill();
        }
        fx.restore();
      }

      // étincelles aspirées vers le point
      if (lt < 0.72) {
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (const p of conv) {
          const s = seg(lt, p.ts, p.ts + p.dur);
          if (s <= 0 || s >= 1) continue;
          const pos = (q) => {
            const R = p.r0 * (1 - E.inCubic(q));
            const a = p.a0 + p.swirl * E.inCubic(q);
            return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * (V ? 1 : 0.8)];
          };
          const c = pos(s), b = pos(Math.max(0, s - 0.09));
          const a = seg(s, 0, 0.18) * (0.35 + 0.65 * s);
          streak(fx, b[0], b[1], c[0], c[1], p.w * u * (0.7 + s), p.white ? '#e8ffe6' : C.neon, a);
        }
        fx.restore();
      }
      // anneaux qui se contractent (aspiration)
      for (let k = 0; k < 3; k++) {
        const s = seg(lt, 0.22 + k * 0.1, 0.62 + k * 0.06);
        if (s <= 0 || s >= 1) continue;
        const R = (V ? 620 : 520) * u * (1 - E.inCubic(s));
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        fx.strokeStyle = rgba(k === 1 ? C.teal : C.neon, 0.55 * s);
        fx.lineWidth = (1.2 + 3 * s) * u;
        fx.beginPath();
        fx.ellipse(cx, cy, R, R, 0, 0, TAU);
        fx.stroke();
        fx.restore();
      }
      // le point : respire, se charge, puis éclate à l'impact
      const charge = E.inCubic(seg(lt, 0.3, T_IMPACT));
      const breath = Math.sin(lt * TAU * 2.0) ** 2;
      const kPt = (1 + 0.35 * breath * (1 - charge) + 1.8 * charge) * (1 - seg(lt, T_IMPACT, T_IMPACT + 0.04));
      if (kPt > 0) {
        seedPoint(fx, W, H, kPt);
        if (lt > 0) {
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          radialGlow(fx, cx, cy, (40 + 300 * charge + 30 * breath) * u, C.neon, 0.06 + 0.4 * charge);
          fx.restore();
        }
      }
      // éclairs
      const fr = Math.floor(lt * 30);
      const strikes = [
        { t0: T_STRIKE - 0.02, t1: T_IMPACT + 0.06, x: cx + (V ? 0.22 : 0.16) * W, y: -0.05 * H, seed: 100, w: 3.2 },
        { t0: 0.655, t1: 0.74, x: V ? -0.05 * W : 0.06 * W, y: V ? 0.86 * H : 1.06 * H, seed: 300, w: 2.2 },
        { t0: 0.695, t1: T_IMPACT + 0.02, x: 1.05 * W, y: V ? 0.3 * H : 0.22 * H, seed: 500, w: 2.0 },
      ];
      for (const sk of strikes) {
        if (lt < sk.t0 || lt > sk.t1 + 0.1) continue;
        const prog = E.outCubic(seg(lt, sk.t0, sk.t0 + 0.035));
        const fl = lt > sk.t1 ? 1 - seg(lt, sk.t1, sk.t1 + 0.1) : 0.55 + 0.45 * hash(fr * 7.3 + sk.seed);
        const bolt = makeBolt(sk.x, sk.y, cx, cy, sk.seed + fr, { depth: 7, branches: 6 });
        drawBolt(fx, bolt, prog, sk.w * u, fl);
      }
      // arcs de charge autour du point
      if (lt > T_STRIKE && lt < T_IMPACT) {
        for (let k = 0; k < 4; k++) {
          const a = hash(fr * 3.1 + k * 17) * TAU, len = (60 + 140 * hash(fr + k * 5.7)) * u;
          drawBolt(fx, makeBolt(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, 900 + fr * 7 + k, { depth: 4, branches: 1 }), 1, 1.2 * u, 0.7);
        }
      }

      // ------------------------------------------------------------- IMPACT
      if (imp) {
        const pz = (a, d) => pulse(lt, T_IMPACT + a, 0.012, d);
        shockRing(fx, cx, cy, tau, f, { radius: V ? 1500 : 1300, width: 28, dur: 0.6 });
        shockRing(fx, cx, cy, tau - 0.05, f, { radius: V ? 1050 : 900, width: 12, dur: 0.55, color: C.teal, alpha: 0.7 });
        shockRing(fx, cx, cy, tau - 0.02, f, { radius: V ? 1300 : 1700, width: 8, dur: 0.7, flat: V ? 0.5 : 0.18, alpha: 0.32 });
        sparks(fx, cx, cy, tau, f, { count: 120, speed: V ? 2400 : 2800, life: 0.85, seed: 5 });
        sparks(fx, cx, cy, tau, f, { count: 40, speed: 3400, life: 0.45, seed: 9, color: '#e8ffe6' });
        flare(fx, cx, cy, 1.3 * pz(0, 0.22), f);
        // braises qui flottent autour du titre
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (const e of embers) {
          if (tau > e.life || tau < 0) continue;
          const k = tau / e.life;
          const d = e.v * (1 - Math.exp(-tau * 3.2)) / 3.2;
          const x = cx + Math.cos(e.a) * d + noise1(lt * 2 + e.ph) * 14 * u;
          const y = cy + Math.sin(e.a) * d * e.flat - e.up * tau;
          const a = (1 - k) * (0.5 + 0.5 * noise1(lt * 9 + e.ph));
          if (a <= 0.02) continue;
          fx.fillStyle = rgba(e.ph > 25 ? '#e8ffe6' : C.neon, a);
          fx.beginPath();
          fx.arc(x, y, e.s * u, 0, TAU);
          fx.fill();
        }
        fx.restore();
      }

      // ------------------------------------------------------------- TITRE
      const G = letterStates(lt);
      if (imp) {
        // halo lumineux des lettres (bloom) puis lettres nettes
        drawLetters(fx, 'fx', 0.85);
        drawLetters(ui, 'ui');
        // arcs électriques résiduels entre les lettres
        if (tau < 0.55) {
          const n = TT.letters.length;
          for (let k = 0; k < 2; k++) {
            const i = Math.floor(hash(fr * 1.7 + k * 31) * (n - 1));
            const A = state[i], B = state[i + 1];
            if (!A.a || !B.a || A.a < 0.5 || B.a < 0.5) continue;
            const la = TT.letters[i], lb = TT.letters[i + 1];
            const ya = A.y - la.cap * 0.5 * A.s, yb = B.y - lb.cap * 0.5 * B.s;
            drawBolt(fx, makeBolt(A.x, ya, B.x, yb, 700 + fr * 13 + k, { depth: 5, branches: 1, rough: 0.7 }), 1, 1.3 * u, 0.8 * (1 - tau / 0.55));
          }
        }
        // balayages lumineux (reflets) confinés aux lettres déjà dessinées sur ui
        for (const [a, b, dir] of [[1.04, 1.46, 1], [1.5, 1.74, -1]]) {
          const sw = seg(lt, a, b);
          if (sw <= 0 || sw >= 1) continue;
          const half = TT.width * 0.5 * G.sG;
          const q = dir > 0 ? E.inOutSine(sw) : 1 - E.inOutSine(sw);
          const bx = lerp(cx - half * 1.3, cx + half * 1.3, q);
          const bw = TT.width * (dir > 0 ? 0.09 : 0.05);
          ui.save();
          ui.globalCompositeOperation = 'source-atop';
          ui.translate(bx, cy);
          ui.transform(1, 0, -0.35 * dir, 1, 0, 0);
          const grd = ui.createLinearGradient(-bw, 0, bw, 0);
          grd.addColorStop(0, 'rgba(255,255,255,0)');
          grd.addColorStop(0.5, `rgba(255,255,255,${dir > 0 ? 0.92 : 0.7})`);
          grd.addColorStop(1, 'rgba(255,255,255,0)');
          ui.fillStyle = grd;
          ui.fillRect(-bw, -H, bw * 2, H * 2);
          ui.restore();
          // reflet lumineux qui accompagne le balayage (flare anamorphique vert)
          flare(fx, bx + (V ? 0 : 0.1 * TT.width * dir), cy + TT.top * G.sG * 0.9, (dir > 0 ? 0.42 : 0.3) * Math.sin(Math.PI * sw), f);
        }
        // LIÈGE (Poppins 200, très espacé) + filets néon
        const lieA = 1 - seg(lt, T_BOOM - 0.04, T_BOOM + 0.1);
        if (lt > 0.98 && lieA > 0) {
          const ly = cy + TT.lie.y * G.sG;
          const ls = TT.lie.size * G.sG;
          const tr = 0.95 + 0.6 * seg(lt, T_BOOM - 0.04, T_BOOM + 0.1);
          ui.save();
          drawText(ui, 'LIÈGE', cx, ly, { size: ls, weight: 200, tracking: tr, align: 'center', mode: 'track', trackFrom: 2.4, t: lt - 0.98, dur: 0.45, color: C.white, alpha: lieA });
          ui.globalAlpha = lieA;
          const tw = textWidth(ui, 'LIÈGE', ls, 200, tr);
          const lp = E.outExpo(seg(lt, 1.05, 1.55));
          const gap = ls * 0.9;
          const maxL = Math.max(0, TT.lie.line * G.sG / 2 - tw / 2 - gap);
          ui.fillStyle = C.neon;
          const yy = ly - ls * 0.36;
          ui.fillRect(cx - tw / 2 - gap - maxL * lp, yy, maxL * lp, Math.max(1.5, 2 * u));
          ui.fillRect(cx + tw / 2 + gap, yy, maxL * lp, Math.max(1.5, 2 * u));
          ui.restore();
        }
      }

      // lignes de vitesse : avancée dans la brume, puis explosion
      if (imp) speedLines(fx, W, H, lt, 0.16 * seg(lt, 0.9, 1.2) + 0.75 * E.inQuad(seg(lt, T_BOOM - 0.05, 2.0)), { count: 150, speed: 1.2 + 1.2 * seg(lt, T_BOOM - 0.1, 2.0) });

      // ------------------------------------------------------------- EXPLOSION vers la caméra
      if (lt > T_BOOM - 0.05) {
        // traînées radiales des lettres
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < TT.letters.length; i++) {
          const o = state[i];
          if (!o.e || o.a < 0.02) continue;
          const dx = o.x - cx, dy = o.y - cy;
          const k = 0.75;
          streak(fx, cx + dx * k, cy + dy * k, o.x, o.y, (2 + 6 * o.e) * u, TT.letters[i].color === C.white ? '#dfffe0' : C.neon, 0.8 * o.a);
        }
        fx.restore();
        
        // points lumineux en profondeur : les futurs téléphones (positions lointaines d'orbit)
        for (let k = 0; k < 5; k++) {
          const gk = E.outCubic(seg(lt, T_BOOM + 0.02 + k * 0.025, T_BOOM + 0.14 + k * 0.025));
          if (gk <= 0) continue;
          const q = f.project(rig.farPos(rig.LAY[k]));
          if (q[2] >= 1 || q[2] <= -1) continue;
          const tw = 0.85 + 0.15 * noise1(lt * 30 + k * 5);
          fx.save();
          fx.globalCompositeOperation = 'lighter';
          radialGlow(fx, q[0], q[1], 70 * u, C.neon, 0.55 * gk * tw);
          radialGlow(fx, q[0], q[1], 16 * u, '#ffffff', 0.95 * gk * tw);
          fx.translate(q[0], q[1]);
          fx.scale(1, 0.07);
          radialGlow(fx, 0, 0, 210 * u, '#d8ffe0', 0.5 * gk * tw);
          fx.restore();
        }
      }

      // ------------------------------------------------------------- post-production
      if (lt < T_IMPACT) {
        post.zoomBlur += 0.035 * E.inCubic(seg(lt, 0.3, T_IMPACT));       // aspiration
        post.flash = Math.max(post.flash,
          0.12 * pulse(lt, T_STRIKE + 0.01, 0.008, 0.018));
        post.flashColor = [0.45, 1, 0.5];
        post.ca += 0.003 * charge;
      } else {
        post.flash = Math.max(post.flash, 1.0 * pulse(lt, T_IMPACT, 0.02, 0.065));
        const sh = seg(lt, T_IMPACT, T_IMPACT + 0.65);
        if (sh < 1) post.shock = [0.5, 0.5, 0.04 + (V ? 0.75 : 1.2) * E.outCubic(sh), 1.4 * Math.pow(1 - sh, 1.4)];
        post.ca += 0.009 * pulse(lt, T_IMPACT, 0.01, 0.16);
        post.rgb = Math.max(post.rgb, 0.006 * pulse(lt, T_IMPACT, 0.01, 0.06));
        post.glitch = Math.max(post.glitch, 0.7 * pulse(lt, T_IMPACT + 0.01, 0.01, 0.05));
        post.bloom = 0.65 + 0.45 * pulse(lt, T_IMPACT, 0.02, 0.3);
      }
      if (imp) post.flashColor = [0.88, 1, 0.9];
      // explosion : zoom blur fort (texte compris)
      post.zoomBlur += 0.22 * E.inQuad(seg(lt, T_BOOM - 0.04, 2.0));
      post.ca += 0.004 * E.inQuad(seg(lt, T_BOOM, 2.0));
      // profondeur de champ : le studio derrière le titre devient un bokeh doux
      post.dof = { focus: 4.5, aperture: 0.0035 * reveal, maxblur: 0.011 };
      post.vignette = 0.95 + 0.3 * reveal;
      // le titre reste net pendant les flous de caméra (sauf l'explosion)
      post.uiBlur = lerp(0.25, 1, seg(lt, T_BOOM - 0.04, T_BOOM + 0.05));
    },
  };
}

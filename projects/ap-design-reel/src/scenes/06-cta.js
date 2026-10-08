// SCENE 06 — CTA / LOOP : logo, profil « + SUIVRE » (sur « Suis le compte »), bouton glass
// « DM POUR COLLABORER » qui apparaît EXACTEMENT sur « DM » (impact + tap) puis pulse,
// notification de message entrante, services. Fin : retour au noir → boucle parfaite
// (la 1re image du Reel est noire, l'impact d'ouverture enchaîne).

import { pulse, TAU, rgba } from '../core/anim.js';
import { glassPill, radialGlow, shockRing, sparks, flare, drawText, setFont as sf } from '../core/draw.js';
import { layout, drawLogo, captions, E, seg, lerp, fitSize, textWidth, setFont } from './kit.js';

// petit avion en papier (icône DM)
function plane(g, x, y, s, color, a) {
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(-1, -0.1); g.lineTo(1, -0.9); g.lineTo(0.45, 0.95); g.lineTo(0.05, 0.25); g.closePath();
  g.fillStyle = color;
  g.fill();
  g.beginPath();
  g.moveTo(0.05, 0.25); g.lineTo(1, -0.9); g.lineTo(-0.02, 0.85); g.closePath();
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fill();
  g.restore();
}

export default function createCta({ cfg, W, H }) {
  const C = cfg.colors;
  const B = cfg.brand;
  const T_ = cfg.texts;
  const Lp = layout(W, H);
  const u = Lp.u;
  const probe = document.createElement('canvas').getContext('2d');
  const btnS = fitSize(probe, T_.cta, 700, 0.04, Lp.maxW * 0.74, 68 * u);
  const btnW = textWidth(probe, T_.cta, btnS, 700, 0.04) + btnS * 3.4;
  const btnH = btnS * 2.5;
  const svcS = fitSize(probe, B.services, 600, 0.22, Lp.maxW * 0.9, 40 * u);
  const Y = { logo: H * 0.215, prof: H * 0.335, btn: H * 0.46, notif: H * 0.575, svc: H * 0.685 };

  return {
    update(f) {
      const { post, fx, ui } = f;
      const { obj, studio } = f.world;
      const T = f.t;
      const lt = f.lt;
      const mSuis = f.mark('L6.Suis', f.clock.start + 1.2);
      const mDM = f.mark('L6.DM', f.clock.start + 3.3);
      const end = f.clock.end;
      const tDM = T - mDM;
      const fin = E.inCubic(seg(T, end - 0.38, end - 0.04)); // retour au noir (boucle)
      post.flashColor = [0.9, 0.88, 1];
      studio.update(T, { glow: 0.2 + 0.7 * pulse(tDM, 0, 0.01, 0.6), beams: 0.25, grid: 0.18, dust: 0.8, motes: 0.6, env: 1.2, envRot: T * 0.3, rim: 1.2 });
      f.camera([0.1 * Math.sin(T * 0.6), 0.05, 6.6], [0, 0, 0], 30);
      // environnement 3D en arrière-plan : anneaux autour du bouton DM, éclats
      obj.rings.visible = true;
      obj.rings.position.set(0.06, -0.05, -1.6);
      obj.rings.scale.setScalar(lerp(1.6, 1.15, E.outExpo(seg(lt, 0, 0.6))) * (1 + 0.05 * pulse(tDM, 0, 0.01, 0.5)));
      obj.rings.children.forEach((r, k) => r.rotation.set(0.15 * Math.sin(T + k), 0.2 * Math.cos(T * 0.7 + k), T * (0.25 + k * 0.2) * (k % 2 ? -1 : 1)));
      obj.shards.visible = true;
      obj.shards.position.set(0, 0, -0.5);
      obj.shards.children.forEach((m) => m.rotation.set(T * m.userData.w + m.userData.s, T * m.userData.w, 0));
      post.dof = { focus: 6.6, aperture: 0.02, maxblur: 0.008 };
      post.flash += 0.25 * pulse(lt, 0, 0.005, 0.12) + 0.6 * pulse(tDM, 0, 0.004, 0.22);
      post.ca += 0.01 * pulse(tDM, 0, 0.01, 0.3);
      post.bloom += 0.4 * pulse(tDM, 0, 0.01, 0.5);
      post.blur = [0, 0.03 * (1 - E.outCubic(seg(lt, 0, 0.14)))];
      post.fade *= 1 - fin;
      post.flash += 0.35 * pulse(T, end - 0.06, 0.02, 0.06); // flash de bouclage

      // ---- logo
      const la = E.outCubic(seg(lt, 0, 0.3));
      drawLogo(ui, f, Lp.cx, Y.logo, 150 * u * lerp(1.3, 1, E.outExpo(seg(lt, 0, 0.4))), la, { wordScale: 0.3 });
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      radialGlow(fx, Lp.cx, Y.logo, 360 * u, C.neon, 0.25 * la);
      fx.restore();

      // ---- profil + « + SUIVRE » (sur « Suis »)
      const ts = T - mSuis;
      const pa = E.outCubic(seg(ts, -0.15, 0.15));
      if (pa > 0) {
        const fs = 40 * u;
        const nameW = textWidth(ui, B.handle, fs, 700, 0.06);
        const folW = textWidth(ui, T_.follow, fs * 0.9, 700, 0.06) + fs * 1.6;
        const av = fs * 1.9;
        const w = av + fs * 0.7 + nameW + fs * 0.9 + folW + fs * 0.5;
        const h = av + fs * 0.6;
        const x = Lp.cx - w / 2, y = Y.prof - h / 2 + (1 - pa) * 40 * u;
        glassPill(ui, x, y, w, h, h / 2, pa, f, { stroke: 'rgba(255,255,255,0.18)', border: 1.6 });
        ui.save();
        ui.globalAlpha = pa;
        // avatar
        const ax = x + fs * 0.3 + av / 2, ay = y + h / 2;
        const ag = ui.createLinearGradient(ax - av / 2, ay - av / 2, ax + av / 2, ay + av / 2);
        ag.addColorStop(0, C.neon2); ag.addColorStop(1, C.neon);
        ui.beginPath(); ui.arc(ax, ay, av / 2, 0, TAU); ui.fillStyle = ag; ui.fill();
        ui.beginPath(); ui.arc(ax, ay, av / 2 - 4 * u, 0, TAU); ui.fillStyle = C.bg; ui.fill();
        ui.restore();
        drawLogo(ui, f, ax, ay, av * 0.38, pa, { word: false });
        setFont(ui, fs, 700, 0.06);
        ui.save();
        ui.globalAlpha = pa;
        ui.fillStyle = C.white;
        ui.textAlign = 'left';
        ui.fillText(B.handle, ax + av / 2 + fs * 0.6, ay + fs * 0.36);
        // bouton suivre : se remplit d'accent sur « Suis », puis « ✓ ABONNÉ » sur « compte »
        const bx = ax + av / 2 + fs * 0.6 + nameW + fs * 0.8, bh = fs * 1.7, by = ay - bh / 2;
        const pop = 1 + 0.12 * pulse(ts, 0.02, 0.01, 0.2);
        ui.translate(bx + folW / 2, ay); ui.scale(pop, pop); ui.translate(-(bx + folW / 2), -ay);
        ui.beginPath(); ui.roundRect(bx, by, folW, bh, bh / 2);
        ui.fillStyle = C.neon; ui.fill();
        setFont(ui, fs * 0.9, 700, 0.06);
        ui.fillStyle = '#ffffff';
        ui.textAlign = 'center';
        ui.fillText(T_.follow, bx + folW / 2, ay + fs * 0.32);
        ui.restore();
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, bx + folW / 2, ay, folW, C.neon, 0.35 * pulse(ts, 0.02, 0.01, 0.5) + 0.1 * pa);
        fx.restore();
        sparks(fx, bx + folW / 2, ay, ts - 0.02, f, { count: 30, seed: 31, speed: 900, life: 0.4, color: C.neon2 });
      }

      // ---- sous-titres = la voix : « Tu veux la prochaine ? » puis « Et pour collaborer… » (remplacé par le bouton sur « DM »)
      const capS = 74 * u;
      captions(f, 'L6a', T_.vo.L6a, Lp.cx, Y.btn + capS * 0.2, { size: capS, maxW: Lp.maxW, emph: ['PROCHAINE'], out: seg(T, mSuis - 0.12, mSuis + 0.05) });
      if (T > f.mark('L6c.start', mDM - 0.9) - 0.1) captions(f, 'L6c', T_.vo.L6c, Lp.cx, Y.btn + capS * 0.2, { size: capS, maxW: Lp.maxW, emph: ['COLLABORER'], out: seg(tDM, -0.08, 0.02) });

      // ---- bouton DM (EXACTEMENT sur « DM ») : arrive en slam, pulse en continu
      if (tDM >= -0.02) {
        const k = E.outBack(seg(tDM, -0.02, 0.22), 2.2);
        const beat = 0.035 * Math.max(0, Math.sin((tDM - 0.3) * Math.PI * 2 * 1.0)) * seg(tDM, 0.3, 0.5);
        const sc = lerp(1.8, 1, k) * (1 + beat);
        const a = seg(tDM, -0.02, 0.05);
        const x = Lp.cx - btnW / 2, y = Y.btn - btnH / 2;
        ui.save();
        ui.translate(Lp.cx, Y.btn); ui.scale(sc, sc); ui.translate(-Lp.cx, -Y.btn);
        glassPill(ui, x, y, btnW, btnH, btnH / 2, a, f, { stroke: rgba(C.neon2, 0.9), border: 3, tint: 'rgba(123,97,255,0.32)', top: 0.22 });
        plane(ui, x + btnS * 1.45, Y.btn, btnS * 0.42, C.white, a);
        drawText(ui, T_.cta, x + btnS * 2.3, Y.btn + btnS * 0.36, { size: btnS, weight: 700, tracking: 0.04, align: 'left', mode: 'static', color: C.white, alpha: a });
        ui.restore();
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, Lp.cx, Y.btn, btnW * 0.75 * sc, C.neon, a * (0.28 + 0.6 * beat / 0.035 * 0.4 + 0.6 * pulse(tDM, 0, 0.01, 0.4)));
        // halo qui pulse autour du bouton
        const pr = (tDM % 1) ;
        if (tDM > 0.35) {
          ui.save();
          ui.globalAlpha = (1 - pr) * 0.6;
          ui.strokeStyle = C.neon2;
          ui.lineWidth = 3 * u;
          ui.beginPath();
          const g2 = 1 + pr * 0.18;
          ui.roundRect(Lp.cx - btnW * g2 / 2, Y.btn - btnH * (1 + pr * 0.5) / 2, btnW * g2, btnH * (1 + pr * 0.5), btnH * (1 + pr * 0.5) / 2);
          ui.stroke();
          ui.restore();
        }
        fx.restore();
        shockRing(fx, Lp.cx, Y.btn, tDM, f, { radius: 1300, width: 14, dur: 0.7, flat: 0.45, color: C.neon });
        sparks(fx, Lp.cx, Y.btn, tDM, f, { count: 110, seed: 41, speed: 2200, life: 0.8, flat: 0.6, color: C.neon2 });
        flare(fx, Lp.cx, Y.btn, 0.9 * pulse(tDM, 0, 0.02, 0.4) * cfg.vfx.flares, f, C.neon);
        // tap du doigt
        const tt = tDM - 0.16;
        if (tt > 0 && tt < 0.5) {
          const tx = Lp.cx + btnW * 0.22, ty = Y.btn + btnH * 0.1;
          ui.save();
          ui.globalAlpha = (1 - tt / 0.5) * 0.85;
          ui.fillStyle = 'rgba(255,255,255,0.55)';
          ui.beginPath(); ui.arc(tx, ty, (30 + 40 * E.outCubic(tt / 0.5)) * u, 0, TAU); ui.fill();
          ui.strokeStyle = '#ffffff'; ui.lineWidth = 3 * u;
          ui.beginPath(); ui.arc(tx, ty, (40 + 120 * E.outCubic(tt / 0.5)) * u, 0, TAU); ui.stroke();
          ui.restore();
        }
      }

      // ---- notification de message entrante
      const tn = tDM - 0.28;
      if (tn > 0) {
        const k = E.outExpo(seg(tn, 0, 0.45));
        const nw = Lp.maxW * 0.98, nh = 170 * u;
        const x = Lp.cx - nw / 2 + (1 - k) * -W * 0.9, y = Y.notif - nh / 2;
        glassPill(ui, x, y, nw, nh, 44 * u, k, f, { stroke: 'rgba(255,255,255,0.22)', border: 1.6, tint: 'rgba(20,18,32,0.75)', top: 0.12 });
        ui.save();
        ui.globalAlpha = k;
        const ic = 104 * u, ix = x + 34 * u + ic / 2, iy = y + nh / 2;
        const ig = ui.createLinearGradient(ix - ic / 2, iy - ic / 2, ix + ic / 2, iy + ic / 2);
        ig.addColorStop(0, C.neon2); ig.addColorStop(1, C.neon);
        ui.beginPath(); ui.roundRect(ix - ic / 2, iy - ic / 2, ic, ic, 28 * u); ui.fillStyle = ig; ui.fill();
        ui.restore();
        plane(ui, ix - 4 * u, iy + 2 * u, ic * 0.27, '#ffffff', k);
        sf(ui, 40 * u, 700, 0.01);
        ui.save();
        ui.globalAlpha = k;
        ui.textAlign = 'left';
        ui.fillStyle = C.white;
        const tx = ix + ic / 2 + 30 * u;
        ui.fillText(T_.notifTitle, tx, iy - 8 * u);
        sf(ui, 34 * u, 500, 0.01);
        ui.fillStyle = '#c9c9d3';
        ui.fillText(T_.notifBody, tx, iy + 40 * u);
        sf(ui, 28 * u, 500, 0.02);
        ui.fillStyle = C.muted;
        ui.textAlign = 'right';
        ui.fillText('maintenant', x + nw - 34 * u, iy - 8 * u);
        // pastille non lu
        ui.beginPath(); ui.arc(x + nw - 50 * u, iy + 30 * u, 12 * u, 0, TAU); ui.fillStyle = C.neon; ui.fill();
        ui.restore();
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, x + nw - 50 * u, iy + 30 * u, 60 * u, C.neon, 0.8 * k);
        fx.restore();
      }

      // ---- services
      drawText(ui, B.services, Lp.cx, Y.svc, { size: svcS, weight: 600, tracking: 0.22, align: 'center', t: lt - 0.35, mode: 'fade', stagger: 0.012, dur: 0.35, color: C.muted });
      const dv = E.outExpo(seg(lt, 0.4, 0.9));
      if (dv > 0) {
        const half = Lp.maxW * 0.3 * dv;
        const grd = ui.createLinearGradient(Lp.cx - half, 0, Lp.cx + half, 0);
        grd.addColorStop(0, rgba(C.neon, 0)); grd.addColorStop(0.5, rgba(C.neon2, 0.9)); grd.addColorStop(1, rgba(C.neon, 0));
        ui.fillStyle = grd;
        ui.fillRect(Lp.cx - half, Y.svc - svcS * 1.6, half * 2, 2.4 * u);
      }
    },
  };
}

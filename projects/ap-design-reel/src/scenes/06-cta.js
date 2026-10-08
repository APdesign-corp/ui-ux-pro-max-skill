// SCENE 06 — CTA / LOOP : logo, bouton argent « ABONNE-TOI » qui arrive en tournant, bouton glass
// « DM POUR COLLABORER » qui apparaît EXACTEMENT sur « DM » (impact + tap) puis pulse,
// notification de message entrante, services. Fin : retour au noir → boucle parfaite
// (la 1re image du Reel est noire, l'impact d'ouverture enchaîne).

import { pulse, TAU, rgba } from '../core/anim.js';
import { glassPill, radialGlow, shockRing, sparks, flare, drawText, setFont as sf } from '../core/draw.js';
import { layout, drawLogo, E, seg, lerp, fitSize, textWidth, setFont } from './kit.js';

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
      const mSub = f.mark('L6.Abonne-toi', f.clock.start + 0.2);
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

      // ---- bouton « ABONNE-TOI » en argent : arrive en tournant (sur « Abonne-toi »)
      const ts = T - mSub;
      if (ts > -0.02) {
        const k = seg(ts, -0.02, 0.62);
        const land = E.outCubic(k);
        const fs = 58 * u;
        const tw = textWidth(ui, T_.follow, fs, 700, 0.08);
        const bw = tw + fs * 3.2, bh = fs * 2.3;
        const bob = Math.sin(Math.max(0, ts - 0.7) * 2.6) * 6 * u * seg(ts, 0.7, 1.0);
        const at = (kk) => ({ th: (1 - E.outCubic(kk)) * 3 * TAU, sc: lerp(0.25, 1, E.outBack(kk, 1.6)), y: Y.prof + (1 - E.outExpo(kk)) * H * 0.22 + bob });
        const silver = (g, x0, w, th, shine) => {
          const gr = g.createLinearGradient(x0, Y.prof - bh, x0 + w, Y.prof + bh);
          const back = Math.cos(th) < 0;
          const st = back ? ['#6b6f78', '#9a9ea8', '#5d616a'] : ['#eef0f4', '#a7abb5', '#ffffff', '#7f838e', '#d7dae0'];
          st.forEach((c, i) => gr.addColorStop(i / (st.length - 1), c));
          g.fillStyle = gr;
          g.fill();
          if (!back && shine > 0) { // reflet spéculaire qui balaie le métal
            const sx = x0 + w * shine;
            const sg = g.createLinearGradient(sx - w * 0.18, 0, sx + w * 0.18, 0);
            sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = sg;
            g.fill();
          }
        };
        const draw = (kk, alpha) => {
          const { th, sc, y } = at(kk);
          const cx = Lp.cx;
          const sx = Math.max(0.04, Math.abs(Math.cos(th)));
          ui.save();
          ui.globalAlpha = alpha;
          ui.translate(cx, y); ui.scale(sc * sx, sc); ui.translate(-cx, -y);
          ui.shadowColor = 'rgba(0,0,0,0.55)'; ui.shadowBlur = 30 * u; ui.shadowOffsetY = 12 * u;
          ui.beginPath(); ui.roundRect(cx - bw / 2, y - bh / 2, bw, bh, bh / 2);
          const sweep = ts < 0.62 ? 0.5 + 0.5 * Math.sin(th) : ((ts - 0.62) % 1.6) / 0.6 * 1.4 - 0.2;
          silver(ui, cx - bw / 2, bw, th, sweep);
          ui.shadowColor = 'transparent';
          ui.lineWidth = 3 * u; ui.strokeStyle = 'rgba(255,255,255,0.9)'; ui.stroke();
          ui.beginPath(); ui.roundRect(cx - bw / 2 + 5 * u, y - bh / 2 + 5 * u, bw - 10 * u, bh - 10 * u, bh / 2 - 5 * u);
          ui.lineWidth = 2 * u; ui.strokeStyle = 'rgba(70,72,80,0.5)'; ui.stroke();
          if (Math.cos(th) > 0) {
            // cloche + texte gravés (encre sombre)
            const ix = cx - tw / 2 - fs * 0.55, iy = y - fs * 0.05;
            ui.fillStyle = '#17171c';
            ui.beginPath();
            ui.moveTo(ix - fs * 0.38, iy + fs * 0.28);
            ui.quadraticCurveTo(ix - fs * 0.3, iy + fs * 0.12, ix - fs * 0.3, iy - fs * 0.08);
            ui.arc(ix, iy - fs * 0.08, fs * 0.3, Math.PI, 0);
            ui.quadraticCurveTo(ix + fs * 0.3, iy + fs * 0.12, ix + fs * 0.38, iy + fs * 0.28);
            ui.closePath(); ui.fill();
            ui.beginPath(); ui.arc(ix, iy + fs * 0.38, fs * 0.09, 0, TAU); ui.fill();
            setFont(ui, fs, 700, 0.08);
            ui.textAlign = 'left';
            ui.fillText(T_.follow, cx - tw / 2 + fs * 0.15, y + fs * 0.36);
          }
          ui.restore();
        };
        // traînée de rotation (flou de mouvement)
        if (k < 1) for (let g = 3; g >= 1; g--) draw(Math.max(0, k - g * 0.035), 0.18 * (1 - k));
        draw(k, seg(ts, -0.02, 0.06));
        const { y: by } = at(k);
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        radialGlow(fx, Lp.cx, by, bw * 0.75, '#dfe3ff', 0.18 * land + 0.5 * pulse(ts, 0.62, 0.01, 0.4));
        fx.restore();
        sparks(fx, Lp.cx, by, ts - 0.62, f, { count: 60, seed: 31, speed: 1500, life: 0.6, flat: 0.5, color: '#e8ebf5' });
        shockRing(fx, Lp.cx, by, ts - 0.62, f, { radius: 700, width: 6, dur: 0.5, flat: 0.4, color: '#dfe3ff', alpha: 0.6 });
        flare(fx, Lp.cx + bw * 0.42, by - bh * 0.3, 0.6 * pulse(ts, 0.62, 0.02, 0.35) * cfg.vfx.flares, f, '#c9d0ff');
        post.flash += 0.15 * pulse(ts, 0.62, 0.005, 0.12);
      }

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
        // particules en orbite autour du bouton (comète lumineuse)
        fx.save();
        fx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) {
          const ph = T * (1.4 + (i % 3) * 0.3) + i * 0.9;
          const rx = btnW * (0.62 + 0.05 * (i % 4)), ry = btnH * (0.95 + 0.1 * (i % 3));
          const px = Lp.cx + Math.cos(ph) * rx, py = Y.btn + Math.sin(ph) * ry;
          radialGlow(fx, px, py, (10 + 8 * (i % 3)) * u, i % 2 ? C.neon2 : C.teal, 0.7 * a * seg(tDM, 0.1, 0.4));
        }
        fx.restore();
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

// SCENE 03 — « La télé. Internet. Le GSM. » Studio clair en 3D (composition de l'affiche) :
// la TV s'allume sur « télé », la box tombe et émet des ondes Wi-Fi sur « Internet », le smartphone
// arrive en tournant sur « GSM » ; une étiquette par mot ; sortie : balayage diagonal en dégradé.

import * as THREE from 'three';
import { pulse, TAU } from '../core/anim.js';
import { iconBadge, brandAt, brandGradient } from '../world/brand.js';
import { dynamicBg, beatAt, gradientSwipe } from './trans.js';
import { layout, E, seg, lerp, setFont, textWidth } from './kit.js';

export default function createProducts({ cfg, W, H }) {
  const C = cfg.colors;
  const Lp = layout(W, H);
  const u = Lp.u;
  const v = new THREE.Vector3();

  function chip(f, label, icon, x, y, t, shift) {
    const k = E.outBack(seg(t, 0, 0.3), 2);
    if (k <= 0) return;
    const { ui } = f;
    const fs = 44 * u, R = fs * 0.85;
    setFont(ui, fs, 700, 0.06);
    const tw = textWidth(ui, label, fs, 700, 0.06);
    const w = R * 2 + fs * 0.6 + tw + fs * 0.9, h = R * 2 + fs * 0.4;
    ui.save();
    ui.translate(x, y); ui.scale(k, k); ui.translate(-x, -y);
    ui.shadowColor = 'rgba(13,27,94,0.18)'; ui.shadowBlur = 30 * u; ui.shadowOffsetY = 10 * u;
    ui.fillStyle = '#ffffff'; ui.beginPath(); ui.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ui.fill();
    ui.shadowColor = 'transparent';
    ui.lineWidth = 3 * u; ui.strokeStyle = brandGradient(ui, x - w / 2, y, x + w / 2, y); ui.stroke();
    ui.restore();
    iconBadge(ui, icon, x - w / 2 + h / 2, y, R * 0.9 * k, { shift });
    ui.save(); ui.globalAlpha = seg(t, 0.05, 0.2);
    setFont(ui, fs, 700, 0.06); ui.fillStyle = C.navy; ui.textAlign = 'left';
    ui.fillText(label, x - w / 2 + h + fs * 0.15, y + fs * 0.36);
    ui.restore();
  }

  return {
    update(f) {
      const { post, ui, bg } = f;
      const T = f.t;
      const st = f.clock.start, end = f.clock.end;
      const lt = T - st;
      const { props, hero, studio } = f.world;
      const mTV = f.mark('L3a.télé', st + 0.25), mNet = f.mark('L3b.Internet', mTV + 0.6), mGsm = f.mark('L3c.GSM', mNet + 0.7);

      if (f.owner) {
        dynamicBg(bg, W, H, T, { k: 0.85, beat: beatAt(T) * 0.5, cy: 0.3 });
        // sol / plateau blanc avec reflet doux
        const fl = bg.createLinearGradient(0, H * 0.62, 0, H);
        fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(0.15, 'rgba(255,255,255,0.95)'); fl.addColorStop(1, 'rgba(232,236,248,1)');
        bg.fillStyle = fl; bg.fillRect(0, H * 0.62, W, H * 0.38);
        const p = lt / (end - st);
        f.camera([lerp(-0.35, 0.3, E.inOutSine(p)), lerp(0.45, 0.25, p), lerp(6.6, 5.9, E.outCubic(p))], [0, 0.0, 0], 30, 0.0);
        studio.update(T, { backdrop: false, beams: 0, grid: 0, dust: 0, motes: 0, env: 1.25, envRot: 0.6 + T * 0.1, key: 1.4, rim: 0.6 });
        post.bloom = 0.15; post.vignette = 0.15; post.ca = 0.0006;
        post.dof = { focus: 6.1, aperture: 0.004, maxblur: 0.004 };

        // TV : apparition + écran qui s'allume
        const tT = T - mTV;
        const kT = E.outBack(seg(tT, -0.05, 0.35), 1.6);
        props.tv.visible = kT > 0.001;
        props.tv.position.set(0, 0.62, -0.4);
        props.tv.scale.setScalar(0.66 * Math.max(0.001, kT));
        props.tv.rotation.set(0, lerp(0.5, -0.12, E.outCubic(seg(tT, -0.05, 0.6))) + 0.03 * Math.sin(T), 0);
        const on = seg(tT, 0.12, 0.3);
        props.tv.userData.screenMat.opacity = on;
        props.tv.userData.screenMat.color.setScalar(1 + 1.5 * pulse(tT, 0.15, 0.01, 0.2));
        post.flash += 0.25 * pulse(tT, 0.15, 0.005, 0.1);

        // box internet : chute + rebond
        const tN = T - mNet;
        const kN = seg(tN, -0.1, 0.25);
        props.box.visible = kN > 0;
        const yN = lerp(2.4, -0.62, E.outCubic(kN)) + Math.abs(Math.sin(seg(tN, 0.25, 0.6) * Math.PI)) * 0.06 * (1 - seg(tN, 0.25, 0.6));
        props.box.position.set(-0.3, yN, 0.55);
        props.box.rotation.set(0.12, 0.5 + 0.08 * Math.sin(T * 0.8), 0);
        props.box.scale.setScalar(0.62);
        props.box.userData.ledMat.color.setScalar(1.2 + 1.2 * (0.5 + 0.5 * Math.sin(T * 6)) * seg(tN, 0.2, 0.3));

        // smartphone : arrive en tournant, se pose incliné contre la box
        const tG = T - mGsm;
        const kG = E.outCubic(seg(tG, -0.12, 0.4));
        hero.group.visible = kG > 0;
        hero.setExplode(0, T);
        hero.group.position.set(lerp(1.8, 0.42, kG), lerp(0.4, -0.5, kG), 0.75);
        hero.group.rotation.set(-0.05, lerp(-6.6, -0.35, kG), lerp(0.4, -0.12, kG));
        hero.group.scale.setScalar(0.62);
      }

      // ondes Wi-Fi depuis la box
      if (f.owner && T > mNet + 0.2) {
        f.engine.scene.updateMatrixWorld();
        const [bx, by] = f.project(v.set(-0.3, -0.45, 0.55));
        for (let i = 0; i < 3; i++) {
          const ph = ((T - mNet - 0.2) * 1.4 + i / 3) % 1;
          ui.save(); ui.globalAlpha = (1 - ph) * 0.9;
          ui.strokeStyle = brandGradient(ui, bx - 300 * u, by, bx + 300 * u, by); ui.lineWidth = 9 * u * (1 - ph * 0.6); ui.lineCap = 'round';
          ui.beginPath(); ui.arc(bx, by + 40 * u, (60 + 340 * ph) * u, -Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75); ui.stroke();
          ui.restore();
        }
      }

      // étiquettes (une par mot dit)
      if (f.owner) {
        chip(f, 'TV', 'tv', W * 0.5, H * 0.495, T - mTV + 0.04, 0);
        chip(f, 'INTERNET', 'wifi', W * 0.3, H * 0.585, T - mNet + 0.04, -0.3);
        chip(f, 'GSM', 'phone', W * 0.74, H * 0.565, T - mGsm + 0.04, 0.4);
        // entrée : on découvre la scène à travers le trou du cercle (dessiné par la scène 2)
      }
      // sortie : balayage diagonal en dégradé qui recouvre l'écran
      if (T < end) gradientSwipe(ui, W, H, seg(T, end - 0.32, end));
      void TAU; void brandAt;
    },
  };
}

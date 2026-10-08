// SEGMENT « final » (26 → 30 s) — monde « Studio » : calme dramatique, un seul téléphone.
//  0.00  sortie du flash blanc de la traversée 5 (1.0 → 0 en 0.45 s)
//  0.40  GSM CENTER · 0.90 adresse · 1.30 slogan · 1.70 « PASSE EN BOUTIQUE » (toucher à 2.0)
//  1.80–3.50  image finale nette et élégante (mouvements lents)
//  3.50–4.00  BOUCLE : tout se replie au centre dans le point de lumière = image 0 du film

import * as THREE from 'three';
import { E, clamp, lerp, seg, TAU } from '../core/anim.js';
import { setFont, textWidth, fitSize, textSweep, radialGlow } from '../core/draw.js';
import { C, maskReveal, brandColorAt, touchRipple, seedPoint } from '../core/type.js';

export const cues = [
  { t: 0.0, type: 'boom', gain: 1.2 },
  { t: 0.4, type: 'hit', gain: 0.9 },
  { t: 0.45, type: 'whoosh', dur: 0.5, gain: 0.5 },
  { t: 0.9, type: 'swish', gain: 0.6 },
  { t: 1.3, type: 'swish', gain: 0.6 },
  { t: 1.7, type: 'pop', gain: 0.8 },
  { t: 2.0, type: 'click', gain: 0.9 },
  { t: 3.5, type: 'suck', dur: 0.45, gain: 0.9 },
];

export default function create(ctx) {
  const { V } = ctx;
  const group = new THREE.Group();
  // sol noir brillant : le reflet est un 2e téléphone inversé sous un sol semi-transparent
  const floorY = -0.9;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshPhysicalMaterial({
    color: '#020403', metalness: 0.6, roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.82,
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.renderOrder = 2;
  group.add(floor);
  // halo de contre-jour derrière le téléphone
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({
    map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(57,255,20,0.55)'); gr.addColorStop(0.4, 'rgba(20,224,160,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.position.set(0, 0.1, -1.6);
  group.add(halo);

  // 16:9 : téléphone au centre, textes de part et d'autre ; 9:16 : texte au-dessus et en dessous
  const camera = (lt) => {
    const k = E.outCubic(seg(lt, 0, 3.5));
    const a = lerp(0.35, 0.08, k);
    const R = V ? lerp(7.4, 6.9, k) : lerp(5.0, 4.5, k);
    return { pos: [Math.sin(a) * R, lerp(0.35, 0.12, k), Math.cos(a) * R], target: [0, V ? -0.3 : 0.32, 0], roll: lerp(0.06, 0, k), fov: V ? 40 : 30 };
  };

  return {
    group,
    camera,
    update(f) {
      const { lt, ui, fx, post, W, H, u, L, world } = f;
      const S = L.safe;
      const fold = E.inCubic(seg(lt, 3.5, 3.95));       // repli final
      const ph = world.phones[0], mirror = world.phones[3];
      const sc = 1 - fold;
      const tilt = lerp(0.55, 0.12, E.inOutCubic(seg(lt, 0, 2.2)));
      for (const [p, m] of [[ph, 1], [mirror, -1]]) {
        p.group.visible = sc > 0.01;
        p.group.scale.set(sc, sc * m, sc);
        p.group.rotation.set(0, tilt + 0.05 * Math.sin(lt * 0.9), lerp(0.08, 0, seg(lt, 0, 2.2)) * m);
        p.group.position.set(0, m > 0 ? 0.05 + 0.03 * Math.sin(lt * 1.3) : 2 * floorY - 0.05 - 0.03 * Math.sin(lt * 1.3), 0);
        p.screen.draw('home', lt + 1);
      }
      floor.visible = halo.visible = fold < 0.98;
      halo.material.opacity = 1 - fold;
      const studioOn = fold < 0.98;
      world.studio.update(f.t, { backdrop: studioOn, glow: 0.2 * (1 - fold), grid: 0.25 * (1 - fold), beams: 0.55 * (1 - fold), dust: 0.7 * (1 - fold), motes: 0.5 * (1 - fold), env: 1.2, envRot: 0.6 + lt * 0.12, rim: 1.4, key: 1.15 });
      world.studio.sweep.intensity = 3 * Math.exp(-Math.pow((lt - 1.1) * 2.2, 2)) * (1 - fold);
      world.studio.sweep.position.set(lerp(-2, 2, seg(lt, 0.5, 1.8)), 0.8, 1.2);
      post.bloom = 0.7; post.vignette = 1.0;
      post.dof = { focus: V ? 6.9 : 4.5, aperture: 0.015, maxblur: 0.004 };
      // sortie du flash blanc
      post.flash += 1.0 * (1 - E.outCubic(seg(lt, 0, 0.45)));
      post.flashColor = [1, 1, 1];

      // ---------- typographie
      ui.save();
      // repli : le calque texte se contracte vers le centre
      ui.translate(W / 2, H / 2); ui.scale(sc, sc); ui.translate(-W / 2, -H / 2);
      ui.globalAlpha = 1 - fold;
      const name = 'GSM CENTER';
      const ns = V ? fitSize(ui, name, 900, -0.02, S.w * 0.98, 180 * u) : fitSize(ui, name, 900, -0.02, S.w * 0.62, 150 * u);
      const ny = V ? S.t + ns * 1.05 : S.t + ns * 1.0;
      const kN = E.outExpo(seg(lt, 0.4, 0.95));
      maskReveal(ui, name, W / 2, ny, { size: ns, weight: 900, tracking: -0.02, p: kN, colorAt: brandColorAt(name), edgeColor: C.neon });
      textSweep(ui, name, W / 2, ny, { size: ns, weight: 900, tracking: -0.02, align: 'center' }, seg(lt, 1.0, 1.8), '#ffffff', 0.7);
      setFont(ui, ns * 0.26, 200, 0.6);
      ui.textAlign = 'center'; ui.fillStyle = C.white;
      ui.globalAlpha = (1 - fold) * clamp(seg(lt, 0.7, 1.0));
      ui.fillText('LIÈGE', W / 2 + ns * 0.08, ny + ns * 0.42);
      ui.globalAlpha = 1 - fold;

      // adresse, slogan, appel à l'action
      const aS = (V ? 50 : 40) * u, sS = (V ? 44 : 36) * u;
      const addr1 = 'Rue St Léonard 203', addr2 = '4000 Liège';
      const ka = E.outExpo(seg(lt, 0.9, 1.35)), ks = E.outExpo(seg(lt, 1.3, 1.75)), kc = E.outBack(seg(lt, 1.7, 2.05), 1.8);
      if (V) {
        // sous le téléphone, dans la zone sûre
        let y = S.b - 290 * u;
        ui.textAlign = 'center';
        ui.globalAlpha = ka * (1 - fold);
        setFont(ui, aS, 800, -0.01); ui.fillStyle = C.white; ui.fillText(addr1, W / 2, y + (1 - ka) * 30 * u);
        setFont(ui, aS * 0.8, 400, 0.06); ui.fillStyle = C.neon; ui.fillText(addr2, W / 2, y + aS * 1.05);
        y += aS * 2.0;
        ui.globalAlpha = ks * (1 - fold);
        drawSlogan(ui, W / 2, y + sS * 0.6, sS, 'center');
        drawCTA(ui, W / 2, S.b - 50 * u, (V ? 40 : 34) * u, kc * sc, lt, u);
      } else {
        // gauche : slogan ; droite : adresse + appel à l'action
        const yl = H * 0.55;
        ui.globalAlpha = ks * (1 - fold);
        ui.textAlign = 'left';
        setFont(ui, sS * 1.25, 300, 0); ui.fillStyle = C.white;
        ui.fillText('Ton téléphone,', S.l, yl);
        setFont(ui, sS * 1.25, 800, -0.01); ui.fillStyle = C.neon;
        ui.fillText('notre spécialité.', S.l, yl + sS * 1.55);
        ui.globalAlpha = ka * (1 - fold);
        ui.textAlign = 'right';
        setFont(ui, aS * 1.15, 800, -0.01); ui.fillStyle = C.white; ui.fillText(addr1, S.r, yl);
        setFont(ui, aS * 0.95, 400, 0.06); ui.fillStyle = C.neon; ui.fillText(addr2, S.r, yl + aS * 1.35);
        const cw = textWidth(ui, 'PASSE EN BOUTIQUE', 34 * u, 800, 0.08) + 110 * u;
        drawCTA(ui, S.r - cw / 2, S.b - 70 * u, 34 * u, kc * sc, lt, u);
      }
      ui.restore();

      // repli final vers le point de lumière (raccord de boucle avec l'image 0)
      if (fold > 0) {
        post.exposure = 1 - 0.6 * fold;
        post.zoomBlur += 0.12 * Math.sin(Math.PI * fold);
        seedPoint(fx, W, H, clamp(fold * 1.2));
      }
      if (lt > 3.95) {
        for (const p of [ph, mirror]) p.group.visible = false;
        world.studio.update(f.t, { backdrop: false, glow: 0, grid: 0, beams: 0, dust: 0, motes: 0 });
        post.exposure = 1; post.dof = null; post.zoomBlur = 0; post.blur = [0, 0]; post.rollBlur = 0;
      }
      void radialGlow; void TAU;
    },
  };
}

function drawSlogan(g, x, y, s, align) {
  const a = 'Ton téléphone, ', b = 'notre spécialité.';
  setFont(g, s, 300, 0);
  const wa = g.measureText(a).width;
  setFont(g, s, 800, -0.01);
  const wb = g.measureText(b).width;
  const x0 = align === 'center' ? x - (wa + wb) / 2 : x;
  g.textAlign = 'left';
  setFont(g, s, 300, 0); g.fillStyle = C.white; g.fillText(a, x0, y);
  setFont(g, s, 800, -0.01); g.fillStyle = C.neon; g.fillText(b, x0 + wa, y);
}

function drawCTA(g, cx, cy, s, k, lt, u) {
  if (k <= 0.01) return;
  const txt = 'PASSE EN BOUTIQUE';
  const w = textWidth(g, txt, s, 800, 0.08) + 110 * u, h = s * 2.3;
  g.save();
  g.globalAlpha = 1;
  g.translate(cx, cy); g.scale(k, k);
  const press = 1 - 0.06 * Math.exp(-Math.pow((lt - 2.05) * 10, 2));
  g.scale(press, press);
  const gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gr.addColorStop(0, C.neon2); gr.addColorStop(1, C.teal);
  g.shadowColor = 'rgba(57,255,20,0.7)'; g.shadowBlur = 40 * u;
  g.fillStyle = gr; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill();
  g.shadowBlur = 0;
  setFont(g, s, 800, 0.08); g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, 0, 2 * u);
  g.textBaseline = 'alphabetic';
  touchRipple(g, w * 0.3, 0, lt - 2.0, 1.3 * u, '#ffffff');
  g.restore();
}

// Orchestrateur : charge les assets, construit le monde 3D, et expose renderFrame(t)
// (déterministe) pour la prévisualisation temps réel et l'export image par image.

import * as THREE from 'three';
import { resolveConfig } from './config.js';
import { makeSceneClock, noise1, pulse } from './core/anim.js';
import { loadSVG } from './core/svg.js';
import { setFamily } from './core/draw.js';
import { Engine } from './engine/renderer.js';
import { createStudio } from './world/studio.js';
import { createPhone } from './world/phone.js';
import { createAccessories } from './world/accessories.js';
import { createObjects } from './world/objects.js';
import { createProps } from './world/props.js';
import { drawWatermark } from './world/brand.js';

import hook from './scenes/01-hook.js';
import unite from './scenes/02-unite.js';
import products from './scenes/03-products.js';
import offer from './scenes/04-offer.js';
import promise from './scenes/05-promise.js';
import brand from './scenes/06-brand.js';

const SCENES = { hook, unite, products, offer, promise, brand };

async function loadFonts(cfg) {
  setFamily(cfg.font.family);
  const weights = [300, 400, 500, 600, 700, 800, 900];
  await Promise.all(
    weights.map(async (w) => {
      const face = new FontFace(
        cfg.font.family,
        `url(node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2) format('woff2')`,
        { weight: String(w) },
      );
      await face.load();
      document.fonts.add(face);
    }),
  );
  await document.fonts.ready;
}

export async function boot(canvas) {
  const cfg = resolveConfig(location.search);
  const timeline = await (await fetch('src/timeline.json')).json();
  const clock = makeSceneClock(timeline);
  await loadFonts(cfg);

  const [introSvg, badgeSvg, repairSvg, hudSvg, icons] = await Promise.all(
    ['intro-symbol', 'logo-badge', 'phone-repair', 'hud-ring', 'source-icons'].map((n) => loadSVG(`assets/svg/${n}.svg`)),
  );
  const assets = { intro: introSvg, badge: badgeSvg, repair: repairSvg, hud: hudSvg, icons };

  const engine = new Engine(canvas, cfg);
  const { scene, camera } = engine;
  const studio = createStudio(engine, cfg);
  const hero = createPhone(cfg, { variant: 'hero', internals: true });
  const sideA = createPhone(cfg, { variant: 'graphite' });
  const sideB = createPhone(cfg, { variant: 'green' });
  const acc = createAccessories(cfg, assets);
  const obj = createObjects(cfg, []);
  const props = createProps(cfg, hero);
  scene.add(hero.group, sideA.group, sideB.group, acc.group, obj.group, props.group);

  // calque de FOND 2D (derrière la 3D) : plan collé à la caméra, texture canvas redessinée à chaque image
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = cfg.video.width; bgCanvas.height = cfg.video.height;
  const bgCtx = bgCanvas.getContext('2d');
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: bgTex, toneMapped: false, depthWrite: false }));
  bgMesh.renderOrder = -10;
  camera.add(bgMesh);
  scene.add(camera);

  const W = cfg.video.width, H = cfg.video.height;
  const u = Math.min(W, H) / 1080;
  const world = { studio, hero, sideA, sideB, acc, obj, props };
  const instances = {};
  for (const s of clock) instances[s.id] = SCENES[s.id]({ cfg, assets, world, engine, W, H, u });

  // Secousses globales dérivées des cues (impacts, snaps, hits) : caméra + calques 2D
  const shakeCues = timeline.cues
    .filter((c) => ['impact', 'snap', 'hit', 'burst'].includes(c.type))
    .map((c) => ({ at: c.t, amp: { impact: 1, snap: 0.6, burst: 0.45, hit: 0.22 }[c.type] * (c.gain ?? 1) }));
  const markers = timeline.markers || {};
  const shakeAt = (t) => {
    let a = 0;
    for (const c of shakeCues) a += c.amp * pulse(t, c.at, 0.01, 0.16);
    return Math.min(1.4, a) * cfg.vfx.intensity;
  };

  const DEBUG_HIDE = (new URLSearchParams(location.search).get('hide') || '').split(',').filter(Boolean);
  const tmp = new THREE.Vector3();
  function renderFrame(T) {
    const t = Math.min(T * cfg.timing.speed, timeline.duration - 1e-6);
    engine.clear2D();
    const post = engine.defaultPost();
    for (const o of [hero.group, sideA.group, sideB.group, acc.group]) o.visible = false;
    for (const k of ['knot', 'knotWire', 'orb', 'rings', 'logo', 'shards', 'feed']) obj[k].visible = false;
    for (const c of obj.extra.children) c.visible = false;
    props.hideAll();
    bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    bgCtx.globalAlpha = 1; bgCtx.globalCompositeOperation = 'source-over'; bgCtx.filter = 'none';
    bgCtx.fillStyle = cfg.colors.bg; bgCtx.fillRect(0, 0, W, H);
    for (const k of Object.keys(acc)) if (acc[k]?.isObject3D && k !== 'group') acc[k].visible = false;

    const sh = shakeAt(t);
    const sx = noise1(t * 31) * sh * 16 * u, sy = noise1(t * 29 + 9) * sh * 12 * u;
    engine.fx.setTransform(1, 0, 0, 1, sx, sy);
    engine.ui.setTransform(1, 0, 0, 1, sx * 0.6, sy * 0.6);

    const f = {
      t, W, H, u, cfg, assets, world, post, engine,
      fx: engine.fx, ui: engine.ui, bg: bgCtx,
      isV: H > W, cx: W / 2, cy: H / 2,
      shake: sh,
      camera(pos, target, fov = 30, roll = 0) {
        camera.fov = fov;
        camera.aspect = W / H;
        camera.position.set(pos[0], pos[1], pos[2]);
        camera.position.x += noise1(t * 23) * sh * 0.025;
        camera.position.y += noise1(t * 27 + 3) * sh * 0.02;
        camera.up.set(Math.sin(roll), Math.cos(roll), 0);
        camera.lookAt(target[0], target[1], target[2]);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
      },
      // projection 3D -> pixels ; accepte un Vector3 ou un Object3D
      project(v, local) {
        scene.updateMatrixWorld();
        if (v.isObject3D) {
          tmp.copy(local || new THREE.Vector3());
          v.localToWorld(tmp);
        } else tmp.copy(v);
        const z = tmp.distanceTo(camera.position);
        tmp.project(camera);
        return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, z, tmp.z < 1];
      },
      // marqueurs de la voix off : instant global d'un mot ("L2.GSM") / même instant en temps local de la scène
      mark(name, fallback = NaN) {
        return name in markers ? markers[name] : fallback;
      },
      ml(name, fallbackLocal = NaN) {
        return name in markers ? f.clock.toLocal(markers[name]) : fallbackLocal;
      },
      dist(obj) {
        scene.updateMatrixWorld();
        return obj.getWorldPosition(tmp).distanceTo(camera.position);
      },
    };

    for (let i = 0; i < clock.length; i++) {
      const s = clock[i];
      const last = i === clock.length - 1;
      if (t < s.start - s.pre || t >= s.end + s.post + (last ? 1 : 0)) continue;
      f.lt = s.toLocal(t);
      f.clock = s;
      f.owner = t >= s.start && (t < s.end || last);
      instances[s.id].update(f);
    }
    if (DEBUG_HIDE.includes('fx')) post.fxGain = 0;
    if (DEBUG_HIDE.includes('ui')) engine.clear2D();
    if (DEBUG_HIDE.length) for (const k of DEBUG_HIDE) {
      const o = acc[k] || studio[k] || (k === 'hero' ? hero.group : null);
      if (o && o.isObject3D) o.visible = false;
    }
    // fond : plan au loin, cadré exactement sur le champ de la caméra
    const dz = 250, hh = 2 * dz * Math.tan((camera.fov * Math.PI) / 360);
    bgMesh.position.set(0, 0, -dz); bgMesh.scale.set(hh * camera.aspect, hh, 1);
    bgTex.needsUpdate = true;
    if (cfg.watermark.enabled) drawWatermark(engine.ui, W, H, cfg.watermark, t);
    engine.render(post, t);
  }

  return {
    cfg,
    timeline,
    duration: timeline.duration / cfg.timing.speed,
    fps: cfg.video.fps,
    renderFrame,
    clock: clock.map(({ toLocal, toGlobal, ...s }) => s),
    markers,
  };
}

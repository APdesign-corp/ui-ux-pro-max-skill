// Orchestrateur : charge les assets, construit le monde 3D, et expose renderFrame(t)
// (déterministe) pour la prévisualisation temps réel et l'export image par image.

import * as THREE from 'three';
import { resolveConfig } from './config.js';
import { makeSceneClock, noise1, pulse, rng, rgba } from './core/anim.js';
import { radialGlow } from './core/draw.js';
import { loadSVG } from './core/svg.js';
import { setFamily } from './core/draw.js';
import { Engine } from './engine/renderer.js';
import { createStudio } from './world/studio.js';
import { createPhone } from './world/phone.js';
import { createAccessories } from './world/accessories.js';
import { createObjects } from './world/objects.js';

import hook from './scenes/01-hook.js';
import showreel from './scenes/02-showreel.js';
import hero from './scenes/03-hero.js';
import kinetic from './scenes/04-kinetic.js';
import reveal from './scenes/05-reveal.js';
import cta from './scenes/06-cta.js';

const SCENES = { hook, showreel, hero, kinetic, reveal, cta };

async function loadFonts(cfg) {
  setFamily(cfg.font.family);
  const weights = [300, 400, 500, 600, 700];
  await Promise.all(
    weights.map(async (w) => {
      const face = new FontFace(
        cfg.font.family,
        `url(node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-${w}-normal.woff2) format('woff2')`,
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
  const obj = createObjects(cfg);
  scene.add(hero.group, sideA.group, sideB.group, acc.group, obj.group);

  const W = cfg.video.width, H = cfg.video.height;
  const u = Math.min(W, H) / 1080;
  const world = { studio, hero, sideA, sideB, acc, obj };
  const instances = {};
  for (const s of clock) instances[s.id] = SCENES[s.id]({ cfg, assets, world, engine, W, H, u });

  // Secousses globales dérivées des cues (impacts, snaps, hits) : caméra + calques 2D
  // ---- couche VFX globale, synchronisée sur le sound design et le tempo
  const hitCues = timeline.cues.filter((c) => ['impact', 'hit', 'snap', 'burst', 'click', 'pop'].includes(c.type));
  const whooshCues = timeline.cues.filter((c) => ['whoosh', 'swish'].includes(c.type));
  const cuts = timeline.scenes.slice(1).map((s) => s.start);
  const mu = timeline.music;
  const beatDur = 60 / mu.bpm;
  const pr = rng(777);
  const bokeh = Array.from({ length: Math.round(70 * cfg.vfx.particles) }, () => ({
    x: pr(), y: pr(), z: 0.2 + pr() * 0.8, s: pr() * 10, w: 0.3 + pr(),
  }));
  function globalFX(t, post) {
    const k = cfg.vfx.intensity;
    // punch sur chaque impact/hit : aberration, mini flash, zoom
    for (const c of hitCues) {
      const g = (c.gain ?? 1) * ({ impact: 1, snap: 0.9, hit: 0.7, burst: 0.7, click: 0.35, pop: 0.3 }[c.type]);
      const p = pulse(t, c.t, 0.006, 0.14);
      if (p <= 0.001) continue;
      post.ca += 0.006 * g * p * k;
      post.flash += 0.035 * g * p * k;
      post.zoomBlur += 0.035 * g * p * k;
      post.bloom += 0.1 * g * p;
    }
    // whip blur horizontal sur chaque whoosh / swish
    for (const c of whooshCues) {
      const d = (c.dur ?? 0.4);
      const p = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - c.t) / d)));
      if (p <= 0) continue;
      const dir = c.pan ? Math.sign(c.pan[1] - c.pan[0]) || 1 : 1;
      post.blur[0] += dir * 0.012 * (c.gain ?? 0.5) * p * cfg.vfx.motionBlur;
    }
    // pulsation au tempo pendant la musique (bloom + vignette qui respire)
    if (t >= mu.pulseFrom && t < mu.pulseTo || t >= mu.padFrom) {
      const b = pulse((t - mu.pulseFrom) % beatDur, 0, 0.01, 0.18);
      post.bloom += 0.07 * b;
      post.vignette *= 1 - 0.06 * b;
    }
    // light leak + flash aux coupes de scène
    for (const ct of cuts) {
      const p = pulse(t, ct, 0.02, 0.22);
      if (p <= 0.002) continue;
      post.flash += 0.06 * p * k;
      engine.fx.save();
      engine.fx.globalCompositeOperation = 'lighter';
      const x = W * (0.15 + 0.7 * ((ct * 7.3) % 1));
      engine.fx.save();
      engine.fx.translate(x, H * 0.45);
      engine.fx.rotate(-0.5);
      engine.fx.scale(0.25, 1.6);
      radialGlow(engine.fx, 0, 0, W * 0.9, cfg.colors.neon2, 0.55 * p);
      engine.fx.restore();
      radialGlow(engine.fx, W * 0.9, H * 0.1, W * 0.8, cfg.colors.teal, 0.25 * p);
      engine.fx.restore();
    }
    // particules bokeh qui dérivent (profondeur) sur tout le Reel, plus visibles sur les beats
    const fade = Math.min(1, t / 0.3);
    engine.fx.save();
    engine.fx.globalCompositeOperation = 'lighter';
    for (const b of bokeh) {
      const x = ((b.x + noise1(b.s + t * 0.15 * b.w) * 0.06 + t * 0.01 * b.w) % 1) * W;
      const y = ((b.y - t * 0.03 * b.z * b.w + 10) % 1) * H;
      const r = (6 + 34 * b.z) * u;
      const a = 0.018 + 0.035 * (1 - b.z);
      radialGlow(engine.fx, x, y, r, b.z > 0.6 ? cfg.colors.neon2 : '#ffffff', a * fade);
    }
    engine.fx.restore();
    void rgba;
  }

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
    for (const k of Object.keys(acc)) if (acc[k]?.isObject3D && k !== 'group') acc[k].visible = false;

    const sh = shakeAt(t);
    const sx = noise1(t * 31) * sh * 16 * u, sy = noise1(t * 29 + 9) * sh * 12 * u;
    engine.fx.setTransform(1, 0, 0, 1, sx, sy);
    engine.ui.setTransform(1, 0, 0, 1, sx * 0.6, sy * 0.6);

    const f = {
      t, W, H, u, cfg, assets, world, post, engine,
      fx: engine.fx, ui: engine.ui,
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
    if (!DEBUG_HIDE.includes('gfx')) globalFX(t, post);
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

// Orchestrateur « Portails » : un seul plan-séquence virtuel de 30 s.
// - Une SEULE caméra Three.js : chaque segment fournit camera(lt) (fonction pure du temps local).
// - Le flou de mouvement est calculé automatiquement à partir de la vitesse de la caméra
//   (translation écran + avancée + roulis), puis complété par les segments (post.blur…).
// - Les deux formats (16:9 télé, 9:16 réseaux) partagent les mêmes segments ; chaque segment
//   recompose sa caméra et sa mise en page avec ctx.V (vertical).
//
// CONTRAT D'UN SEGMENT (src/scenes/NN-id.js) :
//   export const cues = [{ t: <temps LOCAL s>, type: 'impact'|'whoosh'|..., gain?: 0..1.5, pan?: -1..1, dur?: s }];
//   export default function create(ctx) {
//     // ctx = { cfg, engine, scene, THREE, world, W, H, V, u, L, fps, seg }
//     return {
//       group,               // (optionnel) THREE.Group du segment : visible uniquement pendant le segment
//       camera(lt) {         // PURE (aucun état) : appelée aussi à lt - dt pour le flou de mouvement
//         return { pos: [x,y,z], target: [x,y,z], roll: rad, fov: deg (vertical) };
//       },
//       update(f) { ... },   // place les objets, dessine fx/ui, règle f.post
//     };
//   }

import * as THREE from 'three';
import { resolveConfig } from './config.js';
import { noise1, pulse, clamp } from './core/anim.js';
import { setFamily } from './core/draw.js';
import { layout } from './core/type.js';
import { Engine } from './engine/renderer.js';
import { createStudio } from './world/studio.js';
import { createPhone } from './world/phone.js';
import { createScreen } from './world/screens.js';
import { createAccessories } from './world/accessories.js';

import * as s01 from './scenes/01-ignite.js';
import * as s02 from './scenes/02-orbit.js';
import * as s03 from './scenes/03-roll.js';
import * as s04 from './scenes/04-interface.js';
import * as s05 from './scenes/05-circuits.js';
import * as s06 from './scenes/06-glass.js';
import * as s07 from './scenes/07-gear.js';
import * as s08 from './scenes/08-city.js';
import * as s09 from './scenes/09-final.js';

const MODULES = { ignite: s01, orbit: s02, roll: s03, interface: s04, circuits: s05, glass: s06, gear: s07, city: s08, final: s09 };

async function loadFonts(cfg) {
  setFamily(cfg.font.display);
  const faces = [];
  for (const w of [200, 300, 400, 500, 600, 700, 800, 900]) {
    faces.push(new FontFace('Poppins', `url(node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2) format('woff2')`, { weight: String(w) }));
  }
  for (const w of [300, 400, 500, 600, 700]) {
    faces.push(new FontFace('Space Grotesk', `url(node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-${w}-normal.woff2) format('woff2')`, { weight: String(w) }));
  }
  await Promise.all(faces.map(async (f) => { await f.load(); document.fonts.add(f); }));
  await document.fonts.ready;
}

export async function boot(canvas) {
  const cfg = resolveConfig(location.search);
  const timeline = await (await fetch('src/timeline.json')).json();
  await loadFonts(cfg);

  const engine = new Engine(canvas, cfg);
  const { scene, camera } = engine;
  const W = cfg.video.width, H = cfg.video.height;
  const L = layout(cfg, W, H);
  const V = L.V, u = L.u;
  const fps = cfg.video.fps;

  // ---------- monde partagé
  const studio = createStudio(engine, cfg);
  const variants = ['hero', 'graphite', 'green', 'hero', 'graphite', 'green'];
  const phones = variants.map((v, i) => {
    const phone = createPhone(cfg, { variant: v, internals: i === 0 });
    const screen = createScreen(cfg);
    phone.setScreenMap(screen.tex, 1.0);
    scene.add(phone.group);
    return { phone, screen, group: phone.group };
  });
  const acc = createAccessories(cfg, null);
  acc.wifi.visible = false;
  scene.add(acc.group);
  const world = { studio, phones, acc };

  // ---------- segments
  const segs = timeline.segments.map((s) => {
    const mod = MODULES[s.id];
    const ctx = { cfg, engine, scene, THREE, world, W, H, V, u, L, fps, seg: s };
    const inst = mod.default(ctx);
    if (inst.group) { scene.add(inst.group); inst.group.visible = false; }
    const cues = (mod.cues || []).map((c) => ({ ...c, t: c.t + s.start, seg: s.id }));
    return { ...s, dur: s.end - s.start, inst, cues };
  });
  const allCues = segs.flatMap((s) => s.cues).sort((a, b) => a.t - b.t);
  const duration = timeline.duration;

  // Secousses / aberration / glitch globaux dérivés des cues
  const SHAKE = { impact: 1, boom: 1.2, hit: 0.35, whip: 0.5, glass: 0.7, slam: 0.6, snap: 0.5 };
  const shakeAt = (t) => {
    let a = 0;
    for (const c of allCues) if (SHAKE[c.type]) a += SHAKE[c.type] * (c.gain ?? 1) * pulse(t, c.t, 0.008, 0.14);
    return Math.min(1.5, a) * cfg.vfx.intensity;
  };
  const glitchAt = (t) => {
    let a = 0;
    for (const c of allCues) if (c.type === 'glitch' || c.type === 'impact' || c.type === 'boom') a += (c.type === 'glitch' ? 1 : 0.45) * (c.gain ?? 1) * pulse(t, c.t, 0.01, 0.09);
    return Math.min(1.2, a);
  };

  const camState = (s, lt) => {
    const c = s.inst.camera(Math.max(0, lt));
    return { pos: c.pos, target: c.target, roll: c.roll || 0, fov: c.fov || 35, near: c.near, far: c.far };
  };
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpF = new THREE.Vector3();
  const prevCam = new THREE.PerspectiveCamera();

  function applyCam(cam, c, shake = 0, t = 0) {
    const sx = noise1(t * 31) * shake * 0.035, sy = noise1(t * 29 + 9) * shake * 0.03;
    cam.position.set(c.pos[0] + sx, c.pos[1] + sy, c.pos[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.target[0] + sx * 0.6, c.target[1] + sy * 0.6, c.target[2]);
    if (c.roll) cam.rotateZ(c.roll + noise1(t * 23 + 3) * shake * 0.012);
    cam.fov = c.fov;
    cam.aspect = W / H;
    cam.near = c.near || 0.05;
    cam.far = c.far || 300;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  const project = (p) => {
    tmpA.set(p[0], p[1], p[2]).project(camera);
    return [(tmpA.x * 0.5 + 0.5) * W, (-tmpA.y * 0.5 + 0.5) * H, tmpA.z];
  };

  const DEBUG_HIDE = (new URLSearchParams(location.search).get('hide') || '').split(',').filter(Boolean);

  function renderFrame(T) {
    const t = clamp(T, 0, duration - 1e-6);
    engine.clear2D();
    const post = engine.defaultPost();
    for (const p of phones) { p.group.visible = false; p.phone.setExplode(0, t); p.group.position.set(0, 0, 0); p.group.rotation.set(0, 0, 0); p.group.scale.setScalar(1); }
    acc.group.visible = false;
    for (const s of segs) if (s.inst.group) s.inst.group.visible = false;
    studio.update(t, { backdrop: true, grid: 0, beams: 0, dust: 1, motes: 1, env: 1, rim: 1, key: 1 });

    const si = Math.max(0, segs.findIndex((s) => t >= s.start && t < s.end));
    const s = segs[si];
    const lt = t - s.start;

    // ---------- caméra + flou de mouvement automatique
    const sh = shakeAt(t);
    const c = camState(s, lt);
    applyCam(camera, c, sh, t);
    const dt = cfg.vfx.shutter / 60;
    if (lt - dt >= 0) {
      const c0 = camState(s, lt - dt);
      applyCam(prevCam, c0, 0, t);
      prevCam.aspect = W / H; prevCam.updateProjectionMatrix();
      // point focal : à la distance de la cible
      camera.getWorldDirection(tmpF);
      const dist = Math.max(0.3, Math.hypot(c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]));
      tmpA.copy(camera.position).addScaledVector(tmpF, dist);
      tmpB.copy(tmpA).project(prevCam);
      const bx = -tmpB.x * 0.5, by = tmpB.y * 0.5; // déplacement écran (uv) du point focal
      const len = Math.hypot(bx, by), maxL = 0.09;
      const k = len > maxL ? maxL / len : 1;
      post.blur = [bx * k, -by * k];
      // avancée : variation de distance au point focal
      const fwd = (camera.position.clone().sub(prevCam.position)).dot(tmpF);
      post.zoomBlur = clamp(fwd / dist, -0.25, 0.25);
      post.rollBlur = clamp((c.roll - c0.roll), -0.35, 0.35);
    }

    const f = {
      t, lt, dur: s.dur, p: lt / s.dur, seg: s, segIndex: si, cfg, W, H, V, u, L, fps,
      fx: engine.fx, ui: engine.ui, post, world, camera, cam: c, scene, THREE, project, cues: allCues,
      shake: sh,
    };
    if (s.inst.group) s.inst.group.visible = true;
    s.inst.update(f);

    // ---------- effets globaux synchronisés sur les cues
    const gl = glitchAt(t);
    post.glitch = Math.max(post.glitch, gl);
    post.rgb = Math.max(post.rgb, gl * 0.004);
    post.ca += sh * 0.0025;
    for (const id of DEBUG_HIDE) {
      if (id === 'ui') engine.clear2D();
    }
    engine.render(post, t);
  }

  return { renderFrame, duration, cfg, fps, segments: timeline.segments, cues: allCues };
}

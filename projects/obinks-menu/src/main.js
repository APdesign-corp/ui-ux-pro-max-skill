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

import * as s01 from './scenes/01-intro.js';
import * as s02 from './scenes/02-crousty.js';
import * as s03 from './scenes/03-tacos.js';
import * as s04 from './scenes/04-burgers.js';
import * as s05 from './scenes/05-kapsalone.js';
import * as s06 from './scenes/06-hotdog.js';
import * as s07 from './scenes/07-texmex.js';
import * as s08 from './scenes/08-desserts.js';
import * as s09 from './scenes/09-drinks.js';
import * as s10 from './scenes/10-end.js';

const MODULES = { intro: s01, crousty: s02, tacos: s03, burgers: s04, kapsalone: s05, hotdog: s06, texmex: s07, desserts: s08, drinks: s09, end: s10 };

async function loadFonts(cfg) {
  setFamily(cfg.font.display);
  const F = (fam, pkg, weights) => weights.map((w) => new FontFace(fam, `url(node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff2) format('woff2')`, { weight: String(w) }));
  const faces = [
    ...F('Anton', 'anton', [400]),
    ...F('Bebas Neue', 'bebas-neue', [400]),
    ...F('Permanent Marker', 'permanent-marker', [400]),
    ...F('Bangers', 'bangers', [400]),
    ...F('Kaushan Script', 'kaushan-script', [400]),
    ...F('Oswald', 'oswald', [300, 400, 500, 600, 700]),
    ...F('Poppins', 'poppins', [300, 400, 600, 800, 900]),
  ];
  await Promise.all(faces.map(async (f) => { await f.load(); document.fonts.add(f); }));
  await document.fonts.ready;
}

// Photos du menu découpées (assets/menu/manifest.json : { id: { file, w, h, ... } }) → images + textures
import { realizeFood } from './scenes/_kit.js';
async function loadMenuAssets() {
  let manifest = {};
  try { manifest = await (await fetch('assets/menu/manifest.json')).json(); } catch { return {}; }
  manifest.facade = { file: '../source/facade.png' }; // photo de la façade (fin)
  const out = {};
  await Promise.all(Object.entries(manifest).map(async ([id, m]) => {
    const img = new Image();
    img.src = `assets/menu/${m.file}`;
    await img.decode().catch(() => null);
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
    out[id] = { ...m, img, tex };
  }));
  return out;
}

export async function boot(canvas) {
  const cfg = resolveConfig(location.search);
  const timeline = await (await fetch('src/timeline.json')).json();
  await loadFonts(cfg);
  const images = await loadMenuAssets();

  const engine = new Engine(canvas, cfg);
  const { scene, camera } = engine;
  const W = cfg.video.width, H = cfg.video.height;
  const L = layout(cfg, W, H);
  const V = L.V, u = L.u;
  const fps = cfg.video.fps;

  // ---------- monde partagé
  const studio = createStudio(engine, cfg);
  const variants = ['graphite', 'hero'];
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
  // Calque de FOND 2D (rue de nuit, briques, fumée…) : canvas plaqué sur un plan attaché à la caméra,
  // dessiné AVANT toute la 3D. Les segments y dessinent via f.bg (effacé en noir à chaque image).
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = W; bgCanvas.height = H;
  const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace; bgTex.generateMipmaps = false; bgTex.minFilter = THREE.LinearFilter;
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: bgTex, depthWrite: false, depthTest: false, toneMapped: false }));
  bgMesh.renderOrder = -1000; bgMesh.frustumCulled = false;
  camera.add(bgMesh); scene.add(camera);
  const world = { studio, phones, acc, images, bg: bgCtx };

  // Instantané de l'état initial de tout ce qui est partagé : restauré au début de CHAQUE image,
  // pour que le rendu reste déterministe quel que soit l'ordre des images (workers parallèles).
  const snap = [];
  const keep = (o) => { if (o) snap.push({ o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), order: o.rotation.order, v: o.visible }); };
  for (const p of phones) { keep(p.group); keep(p.phone.inner); }
  keep(acc.group); for (const c of acc.group.children) keep(c);
  for (const l of [studio.sweep, studio.rimG, studio.rimT, studio.key]) keep(l);
  const lightInit = [studio.sweep, studio.rimG, studio.rimT, studio.key].map((l) => ({ l, i: l.intensity, c: l.color.clone() }));
  const restoreShared = () => {
    for (const r of snap) { r.o.rotation.order = r.order; r.o.position.copy(r.p); r.o.quaternion.copy(r.q); r.o.scale.copy(r.s); r.o.visible = r.v; }
    for (const r of lightInit) { r.l.intensity = r.i; r.l.color.copy(r.c); }
    for (const p of phones) { p.phone.setScreenMap(p.screen.tex, 1.0); p.phone.setCracked && 0; }
    scene.fog = null;
  };

  // ---------- segments
  const segs = timeline.segments.map((s) => {
    const mod = MODULES[s.id];
    const ctx = { cfg, engine, scene, THREE, world, W, H, V, u, L, fps, seg: s };
    const inst = mod.default(ctx);
    if (inst.group) { scene.add(inst.group); inst.group.visible = false; }
    const k = s.design ? s.design / (s.end - s.start) : 1; // compression temporelle (scène conçue pour s.design secondes)
    const cues = (mod.cues || []).map((c) => ({ ...c, t: c.t / k + s.start, seg: s.id }));
    return { ...s, k, dur: s.design || s.end - s.start, inst, cues };
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
    restoreShared();
    for (const p of phones) { p.group.visible = false; p.phone.setExplode(0, t); }
    acc.group.visible = false;
    for (const s of segs) if (s.inst.group) s.inst.group.visible = false;
    studio.update(t, { backdrop: false, grid: 0, beams: 0, dust: 0, motes: 0, env: 1, rim: 1, key: 1, glow: 0, envRot: 0 });
    bgCtx.reset(); bgCtx.fillStyle = cfg.colors.bg; bgCtx.fillRect(0, 0, W, H);

    const si = Math.max(0, segs.findIndex((s) => t >= s.start && t < s.end));
    const s = segs[si];
    const lt = (t - s.start) * s.k;

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
      bg: bgCtx,
      t, lt, dur: s.dur, p: lt / s.dur, seg: s, segIndex: si, cfg, W, H, V, u, L, fps,
      fx: engine.fx, ui: engine.ui, post, world, camera, cam: c, scene, THREE, project, cues: allCues,
      shake: sh,
    };
    if (s.inst.group) s.inst.group.visible = true;
    s.inst.update(f);
    // nourriture réelle : photos du menu à la place du produit 3D (vue éclatée en tranches)
    if (s.inst.real) { const R = s.inst.real(f).filter(Boolean); for (const r of R) realizeFood(f, r.holder, r.food, r.im, r.opts); for (const r of R) r.holder.visible = false; }

    // ---------- effets globaux synchronisés sur les cues
    const gl = glitchAt(t);
    post.glitch = Math.max(post.glitch, gl);
    post.rgb = Math.max(post.rgb, gl * 0.004);
    post.ca += sh * 0.0025;
    for (const id of DEBUG_HIDE) {
      if (id === 'ui') engine.clear2D();
    }
    // plan de fond : collé au fond du frustum de la caméra courante
    const bd = Math.min(200, camera.far * 0.9);
    const bh = 2 * bd * Math.tan((camera.fov * Math.PI) / 360);
    bgMesh.position.set(0, 0, -bd); bgMesh.scale.set(bh * camera.aspect, bh, 1);
    bgTex.needsUpdate = true;
    engine.render(post, t);
  }

  return { renderFrame, duration, cfg, fps, segments: timeline.segments, cues: allCues };
}

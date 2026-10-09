// Studio virtuel : environnement HDR (softboxes blanches + panneaux vert néon) pour des
// reflets métalliques réalistes, fond, sol grille (motif du site), faisceaux volumétriques,
// poussière et particules vertes 3D.

import * as THREE from 'three';
import { BackdropShader, GridFloorShader, BeamShader, ParticleShader } from '../engine/shaders.js';
import { rng } from '../core/anim.js';

export function createStudio(engine, cfg) {
  const { renderer, scene } = engine;
  const green = new THREE.Color(cfg.colors.neon);
  const teal = new THREE.Color(cfg.colors.teal);

  // ---------- Environnement de réflexion (PMREM)
  const env = new THREE.Scene();
  env.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(24, 14, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.004, 0.006, 0.005), side: THREE.BackSide }),
    ),
  );
  const panel = (w, h, color, intensity, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(12, 1.1, '#ffffff', 7, [0, 6.5, 1]);       // bande haute
  panel(0.9, 9, '#ffffff', 4.5, [-9, 0.5, 3]);     // strip gauche
  panel(0.7, 9, '#ffffff', 2.4, [9, 0.5, -4]);     // strip droit
  panel(2.6, 8, cfg.colors.neon, 3.2, [8, -0.5, 5]);   // panneau vert avant-droit
  panel(3.5, 6, cfg.colors.neon, 1.6, [-7, -1.5, -8]); // vert arrière-gauche
  panel(16, 0.35, '#ffffff', 2.5, [0, -2, 10]);    // liseré bas avant (filet sur les tranches)
  panel(3, 3, cfg.colors.teal, 1.2, [-3, -6.5, 4]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.025).texture;
  scene.environmentIntensity = 1.0;

  // ---------- Lumières directes (highlights)
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rimG = new THREE.PointLight(green, 18, 12, 2);
  rimG.position.set(3, 1, -2);
  scene.add(rimG);
  const rimT = new THREE.PointLight(teal, 8, 12, 2);
  rimT.position.set(-3, -1.5, -1.5);
  scene.add(rimT);
  const sweep = new THREE.PointLight(0xffffff, 0, 6, 2); // lumière balayante pilotée par les scènes
  scene.add(sweep);

  // ---------- Fond
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 50),
    new THREE.ShaderMaterial({
      ...BackdropShader,
      uniforms: THREE.UniformsUtils.clone(BackdropShader.uniforms),
      depthWrite: false,
    }),
  );
  backdrop.material.uniforms.uBg.value = new THREE.Color(cfg.colors.bg);
  backdrop.material.uniforms.uGlow.value = green.clone();
  backdrop.material.uniforms.uGlow2.value = teal.clone();
  backdrop.material.uniforms.uRes.value = [engine.W, engine.H];
  backdrop.position.set(0, 0, -18);
  backdrop.renderOrder = -10;
  scene.add(backdrop);

  // ---------- Sol grille (rappel de la grille du site)
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({
      ...GridFloorShader,
      uniforms: THREE.UniformsUtils.clone(GridFloorShader.uniforms),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  grid.material.uniforms.uColor.value = new THREE.Color(cfg.colors.neon).multiplyScalar(0.12);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -1.35;
  scene.add(grid);

  // ---------- Faisceaux volumétriques
  const beams = new THREE.Group();
  const beamMat = new THREE.ShaderMaterial({
    ...BeamShader,
    uniforms: THREE.UniformsUtils.clone(BeamShader.uniforms),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  beamMat.uniforms.uColor.value = green.clone().multiplyScalar(0.07);
  const beamGeo = new THREE.CylinderGeometry(0.06, 1.6, 11, 48, 1, true);
  beamGeo.translate(0, -5.5, 0);
  [[-2.6, 0.35], [0, 0], [2.6, -0.35]].forEach(([x, rz], i) => {
    const m = new THREE.Mesh(beamGeo, beamMat);
    m.position.set(x, 5.6, -4 - i * 0.3);
    m.rotation.z = rz;
    beams.add(m);
  });
  scene.add(beams);

  // ---------- Particules 3D
  const makePoints = (count, box, size, color, opacity, seed, drift) => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3);
    const sd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * box[0];
      pos[i * 3 + 1] = (r() - 0.5) * box[1];
      pos[i * 3 + 2] = (r() - 0.5) * box[2];
      sd[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const mat = new THREE.ShaderMaterial({
      ...ParticleShader,
      uniforms: THREE.UniformsUtils.clone(ParticleShader.uniforms),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mat.uniforms.uColor.value = new THREE.Color(color);
    mat.uniforms.uOpacity.value = opacity;
    mat.uniforms.uSize.value = size;
    mat.uniforms.uBox.value = box;
    mat.uniforms.uDrift.value = drift;
    mat.uniforms.uPixel.value = engine.H / 1080;
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  };
  const k = cfg.vfx.particles;
  const dust = makePoints(Math.round(1400 * k), [14, 8, 12], 9, '#cfe8d4', 0.35, 11, [0.02, 0.05, 0.01]);
  const motes = makePoints(Math.round(260 * k), [12, 7, 10], 16, cfg.colors.neon, 0.9, 23, [0.03, 0.14, 0.02]);

  return {
    backdrop,
    grid,
    beams,
    beamMat,
    dust,
    motes,
    key,
    rimG,
    rimT,
    sweep,
    update(t, s = {}) {
      backdrop.material.uniforms.uIntensity.value = s.glow ?? 1;
      backdrop.material.uniforms.uTime.value = t;
      backdrop.visible = s.backdrop ?? true;
      grid.visible = (s.grid ?? 0) > 0.001;
      grid.material.uniforms.uOpacity.value = s.grid ?? 0;
      beams.visible = (s.beams ?? 0) > 0.001;
      beamMat.uniforms.uIntensity.value = s.beams ?? 0;
      for (const p of [dust, motes]) p.material.uniforms.uTime.value = t;
      dust.material.uniforms.uOpacity.value = 0.35 * (s.dust ?? 1);
      motes.material.uniforms.uOpacity.value = 0.9 * (s.motes ?? 1);
      scene.environmentIntensity = s.env ?? 1;
      scene.environmentRotation.set(0, s.envRot ?? 0, 0);
      rimG.intensity = 18 * (s.rim ?? 1);
      rimT.intensity = 8 * (s.rim ?? 1);
      key.intensity = 1.6 * (s.key ?? 1);
    },
  };
}

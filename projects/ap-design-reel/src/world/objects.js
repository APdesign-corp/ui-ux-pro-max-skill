// Objets 3D du Reel AP Design : sculpture chromée (torus knot), orbe de verre,
// anneaux métalliques, monogramme AP extrudé, éclats (shards), flux de "posts" du scroll.

import * as THREE from 'three';
import { rng } from '../core/anim.js';
import { canvasTexture } from './textures.js';
import { setFont } from '../core/draw.js';

// Monogramme AP (géométrie propre, unités ~1.3 x 1)
export function apShapes() {
  const A = new THREE.Shape();
  A.moveTo(0, 0); A.lineTo(0.31, 1); A.lineTo(0.49, 1); A.lineTo(0.8, 0); A.lineTo(0.61, 0);
  A.lineTo(0.545, 0.22); A.lineTo(0.255, 0.22); A.lineTo(0.19, 0); A.closePath();
  const hole = new THREE.Path();
  hole.moveTo(0.3, 0.37); hole.lineTo(0.5, 0.37); hole.lineTo(0.4, 0.71); hole.closePath();
  A.holes.push(hole);
  const P = new THREE.Shape();
  P.moveTo(0.9, 0); P.lineTo(1.08, 0); P.lineTo(1.08, 0.36); P.lineTo(1.24, 0.36);
  P.absarc(1.24, 0.68, 0.32, -Math.PI / 2, Math.PI / 2, false);
  P.lineTo(0.9, 1); P.closePath();
  const ph = new THREE.Path();
  ph.moveTo(1.08, 0.52); ph.lineTo(1.24, 0.52);
  ph.absarc(1.24, 0.68, 0.16, -Math.PI / 2, Math.PI / 2, false);
  ph.lineTo(1.08, 0.84); ph.closePath();
  P.holes.push(ph);
  return [A, P];
}

// Même monogramme en Path2D pour les calques 2D (repère y vers le bas, hauteur 1)
export function apPath2D() {
  const p = new Path2D();
  const pt = (x, y) => [x, 1 - y];
  const poly = (pts) => { pts.forEach(([x, y], i) => { const [X, Y] = pt(x, y); i ? p.lineTo(X, Y) : p.moveTo(X, Y); }); p.closePath(); };
  poly([[0, 0], [0.31, 1], [0.49, 1], [0.8, 0], [0.61, 0], [0.545, 0.22], [0.255, 0.22], [0.19, 0]]);
  poly([[0.3, 0.37], [0.4, 0.71], [0.5, 0.37]]);
  p.moveTo(0.9, 1); p.lineTo(1.08, 1); p.lineTo(1.08, 0.64); p.lineTo(1.24, 0.64);
  p.arc(1.24, 0.32, 0.32, Math.PI / 2, -Math.PI / 2, true); p.lineTo(0.9, 0); p.closePath();
  p.moveTo(1.08, 0.48); p.lineTo(1.24, 0.48); p.arc(1.24, 0.32, 0.16, Math.PI / 2, -Math.PI / 2, true);
  p.lineTo(1.08, 0.16); p.closePath();
  return p;
}

export function createObjects(cfg) {
  const accent = new THREE.Color(cfg.colors.neon);
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#c2c5cc', metalness: 1, roughness: 0.14, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 0.85 });
  const darkMetal = new THREE.MeshPhysicalMaterial({ color: '#2a2a31', metalness: 1, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.3 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#cfd6ff', metalness: 0, roughness: 0.02, transmission: 0, transparent: true, opacity: 0.35,
    clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2, ior: 1.5,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(3), toneMapped: true });
  const wireMat = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2.2), wireframe: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

  // sculpture chromée
  const knotGeo = new THREE.TorusKnotGeometry(0.62, 0.2, 360, 48, 2, 3);
  const knot = new THREE.Mesh(knotGeo, chrome);
  const knotWire = new THREE.Mesh(new THREE.TorusKnotGeometry(0.62, 0.2, 120, 16, 2, 3), wireMat);

  // orbe de verre + noyau lumineux
  const orb = new THREE.Group();
  orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.75, 96, 64), glass));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 3), glowMat);
  orb.add(core);
  orb.userData.core = core;

  // anneaux métalliques concentriques
  const rings = new THREE.Group();
  [1.2, 1.55, 1.95].forEach((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035 + i * 0.01, 24, 220), i === 1 ? chrome : darkMetal);
    m.userData.i = i;
    rings.add(m);
  });
  const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.008, 8, 220), glowMat);
  rings.add(ringGlow);

  // monogramme AP extrudé (chrome) + liseré lumineux
  const logo = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(apShapes(), { depth: 0.18, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 6, curveSegments: 48 });
  geo.center();
  const logoMesh = new THREE.Mesh(geo, chrome);
  logo.add(logoMesh);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: accent.clone().multiplyScalar(2.5), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
  logo.add(edge);
  logo.userData.edge = edge;

  // éclats flottants (shards)
  const shards = new THREE.Group();
  const r = rng(91);
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + r() * 0.14, 0), r() < 0.25 ? glowMat : (r() < 0.5 ? chrome : darkMetal));
    m.position.set((r() - 0.5) * 5, (r() - 0.5) * 7, -1 - r() * 5);
    m.userData = { s: r() * 10, w: 0.3 + r() };
    shards.add(m);
  }

  // flux vertical de "posts" pour la séquence SCROLL
  const cardTex = Array.from({ length: 6 }, (_, k) => canvasTexture(540, 960, (g, w, h) => {
    const rr = rng(300 + k);
    const grd = g.createLinearGradient(0, 0, w, h);
    const hues = [['#4a4a55', '#2a2a32'], ['#55555f', '#30303a'], ['#45454f', '#2c2c35']][k % 3];
    grd.addColorStop(0, hues[0]); grd.addColorStop(1, hues[1]);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // contenu "banal" : blocs gris, texte factice
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.fillRect(40, 120, w - 80, h * 0.45);
    for (let i = 0; i < 4; i++) g.fillRect(40, h * 0.62 + i * 46, (w - 80) * (0.5 + rr() * 0.5), 22);
    g.beginPath(); g.arc(80, 60, 28, 0, Math.PI * 2); g.fill();
    g.fillRect(124, 48, 160, 22);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    setFont(g, 26, 500, 0.1); g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillText('♡     ↗', 40, h - 60);
  }));
  const feed = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.55), new THREE.MeshBasicMaterial({ map: cardTex[i % cardTex.length], toneMapped: false }));
    m.position.y = -i * 3.75;
    feed.add(m);
  }

  const group = new THREE.Group();
  const extra = new THREE.Group(); // objets propres aux scènes (masqués à chaque image)
  for (const o of [knot, knotWire, orb, rings, logo, shards, feed, extra]) group.add(o);
  return { group, knot, knotWire, orb, rings, logo, shards, feed, extra, chrome, glowMat, wireMat };
}

// Accessoires "studio" : boîtier + écouteurs, chargeur + câble, coque, casque (multimédia),
// hologramme internet (globe filaire + icône wifi du site).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PHONE, roundedRectShape } from './phone.js';
import { iconHoloTexture } from './textures.js';

export function createAccessories(cfg, assets) {
  const white = new THREE.MeshPhysicalMaterial({
    color: '#c9cecc', roughness: 0.26, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.75,
  });
  const whiteMatte = new THREE.MeshPhysicalMaterial({ color: '#b9bebc', roughness: 0.5, clearcoat: 0.3, envMapIntensity: 0.7 });
  const graphite = new THREE.MeshPhysicalMaterial({ color: '#1a1d1f', roughness: 0.42, metalness: 0.3, clearcoat: 0.4, envMapIntensity: 1 });
  const soft = new THREE.MeshStandardMaterial({ color: '#0d0f10', roughness: 0.85, metalness: 0 });
  const steel = new THREE.MeshPhysicalMaterial({ color: '#a9aeb2', metalness: 1, roughness: 0.3, envMapIntensity: 0.9 });
  const neonEmis = new THREE.MeshStandardMaterial({ color: '#000', emissive: cfg.colors.neon, emissiveIntensity: 3 });

  // ---- Écouteurs : boîtier + 2 écouteurs
  const earbuds = new THREE.Group();
  const caseB = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.27, 0.22, 5, 0.1), white);
  caseB.position.y = -0.055;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.11, 0.22, 5, 0.05), white);
  lid.position.y = 0.14;
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), neonEmis);
  led.position.set(0, 0.0, 0.111);
  earbuds.add(caseB, lid, led);
  const bud = () => {
    const b = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 20), white);
    head.scale.set(1, 0.92, 1.08);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 12), graphite);
    tip.position.set(0, 0.01, 0.065);
    tip.scale.z = 0.5;
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.17, 6, 16), white);
    stem.position.set(0, -0.12, -0.01);
    b.add(head, tip, stem);
    return b;
  };
  const b1 = bud();
  b1.position.set(-0.36, 0.25, 0.1);
  b1.rotation.set(0.3, 0.6, 0.35);
  const b2 = bud();
  b2.position.set(0.34, 0.33, -0.05);
  b2.rotation.set(-0.2, -0.7, -0.4);
  earbuds.add(b1, b2);

  // ---- Chargeur + câble tressé
  const charger = new THREE.Group();
  const brick = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.3, 0.26, 5, 0.06), whiteMatte);
  const port = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.03, 0.02, 2, 0.012), soft);
  port.position.set(0, 0, 0.131);
  charger.add(brick, port);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.14),
    new THREE.Vector3(0.05, -0.05, 0.4),
    new THREE.Vector3(-0.25, -0.25, 0.55),
    new THREE.Vector3(-0.55, -0.1, 0.35),
    new THREE.Vector3(-0.62, 0.18, 0.08),
    new THREE.Vector3(-0.45, 0.32, -0.12),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.018, 14, false), graphite);
  const plug = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.035, 2, 0.015), steel);
  const end = curve.getPoint(1);
  plug.position.copy(end);
  plug.lookAt(curve.getPoint(0.97));
  plug.rotateX(Math.PI / 2);
  charger.add(cable, plug);

  // ---- Coque (vert fumé translucide) avec découpe photo
  const caseShell = new THREE.Group();
  const outer = roundedRectShape(PHONE.W + 0.04, PHONE.H + 0.04, PHONE.R + 0.02);
  const backShape = outer.clone();
  const hole = new THREE.Path();
  const hx = (PHONE.W + 0.04) / 2 - 0.2, hy = (PHONE.H + 0.04) / 2 - 0.2;
  hole.absarc(hx, hy, 0.17, 0, Math.PI * 2, true);
  backShape.holes.push(hole);
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#2c8a52', roughness: 0.12, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04,
    transparent: true, opacity: 0.78, envMapIntensity: 1.6,
  });
  const backPlate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(backShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 32 }),
    shellMat,
  );
  const rimShape = outer.clone();
  rimShape.holes.push(roundedRectShape(PHONE.W - 0.01, PHONE.H - 0.01, PHONE.R - 0.01));
  const rim = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rimShape, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 32 }),
    shellMat,
  );
  rim.position.z = 0.012;
  caseShell.add(backPlate, rim);
  caseShell.scale.setScalar(0.62);

  // ---- Casque (multimédia)
  const headphones = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.032, 18, 90, Math.PI), graphite);
  const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.395, 0.024, 14, 90, Math.PI * 0.8), soft);
  cushion.rotation.z = Math.PI * 0.1;
  headphones.add(band, cushion);
  [-1, 1].forEach((s) => {
    const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), steel);
    slider.position.set(s * 0.42, -0.07, 0);
    const cup = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.11, 48), graphite);
    shell.rotation.z = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.008, 10, 64), steel);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = s * 0.056;
    const pad = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 16, 48), soft);
    pad.rotation.y = Math.PI / 2;
    pad.position.x = -s * 0.07;
    const accent = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.004, 8, 48), neonEmis);
    accent.rotation.y = Math.PI / 2;
    accent.position.x = s * 0.058;
    cup.add(shell, ring, pad, accent);
    cup.position.set(s * 0.44, -0.24, 0);
    headphones.add(slider, cup);
  });
  headphones.scale.setScalar(0.85);

  // ---- Internet : globe filaire holographique + icône wifi du site
  const internet = new THREE.Group();
  const holoMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(cfg.colors.neon).multiplyScalar(1.6),
    transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = [];
  const R = 0.36;
  for (let lat = -60; lat <= 60; lat += 30) {
    const r = R * Math.cos((lat * Math.PI) / 180), y = R * Math.sin((lat * Math.PI) / 180);
    for (let i = 0; i < 64; i++) {
      const a0 = (i / 64) * Math.PI * 2, a1 = ((i + 1) / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a0) * r, y, Math.sin(a0) * r), new THREE.Vector3(Math.cos(a1) * r, y, Math.sin(a1) * r));
    }
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const a = (lon * Math.PI) / 180;
    for (let i = 0; i < 64; i++) {
      const t0 = (i / 64) * Math.PI * 2, t1 = ((i + 1) / 64) * Math.PI * 2;
      const p = (t) => new THREE.Vector3(Math.cos(a) * Math.cos(t) * R, Math.sin(t) * R, Math.sin(a) * Math.cos(t) * R);
      pts.push(p(t0), p(t1));
    }
  }
  const globe = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), holoMat);
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.004, 8, 128),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.colors.teal).multiplyScalar(2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  orbit.rotation.x = Math.PI / 2.4;
  internet.add(globe, orbit);

  const wifi = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({
      map: iconHoloTexture(cfg, assets.icons.group('internet')),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.6, 1.8, 1.6),
    }),
  );

  const all = { earbuds, charger, caseShell, headphones, internet, wifi };
  const group = new THREE.Group();
  Object.values(all).forEach((o) => group.add(o));
  return { group, ...all, holoMat };
}

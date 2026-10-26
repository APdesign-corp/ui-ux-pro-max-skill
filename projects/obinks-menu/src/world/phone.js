// Smartphone premium 3D procédural : cadre métal extrudé biseauté, verre noir,
// écran émissif, dos en verre givré avec module photo et gravure "GSM CENTER",
// boutons latéraux. Le modèle "hero" contient aussi les composants internes
// (dalle, batterie, carte mère, connecteur) pour la vue éclatée de la réparation.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { noise1 } from '../core/anim.js';
import { screenTexture, engravingTexture, pcbTexture, batteryTexture } from './textures.js';

export const PHONE = { W: 0.74, H: 1.56, D: 0.082, R: 0.115, B: 0.012 };

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// UV 0..1 sur la boîte englobante (ShapeGeometry fournit des UV en coordonnées brutes)
export function fitUVs(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - b.min.x) / (b.max.x - b.min.x), (pos.getY(i) - b.min.y) / (b.max.y - b.min.y));
  }
  uv.needsUpdate = true;
  return geo;
}

const VARIANTS = {
  hero: { frame: '#9aa1a7', back: '#c6cbcf', backRough: 0.32 },
  graphite: { frame: '#50565c', back: '#1b1f22', backRough: 0.36 },
  green: { frame: '#a9b2ab', back: '#1f4a33', backRough: 0.34 },
};

let shared = null;
function sharedAssets(cfg) {
  if (shared) return shared;
  const { W, H, D, R, B } = PHONE;
  const depth = D - 2 * B;
  const body = new THREE.ExtrudeGeometry(roundedRectShape(W - 2 * B, H - 2 * B, R - B), {
    depth,
    bevelEnabled: true,
    bevelThickness: B,
    bevelSize: B,
    bevelSegments: 6,
    curveSegments: 40,
  });
  body.translate(0, 0, -depth / 2);
  body.computeVertexNormals();
  const glass = fitUVs(new THREE.ShapeGeometry(roundedRectShape(W - 2 * B - 0.004, H - 2 * B - 0.004, R - B - 0.002), 40));
  const screen = fitUVs(new THREE.ShapeGeometry(roundedRectShape(W - 2 * B - 0.034, H - 2 * B - 0.034, R - B - 0.017), 40));
  const plate = new THREE.ExtrudeGeometry(roundedRectShape(0.31, 0.31, 0.085), {
    depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 4, curveSegments: 24,
  });
  shared = {
    body,
    glass,
    screen,
    plate,
    lensRing: new THREE.CylinderGeometry(0.058, 0.058, 0.022, 48),
    lensGlass: new THREE.CylinderGeometry(0.045, 0.045, 0.024, 48),
    lensEye: new THREE.SphereGeometry(0.03, 32, 16),
    button: new RoundedBoxGeometry(0.014, 0.12, 0.03, 2, 0.006),
    engr: new THREE.PlaneGeometry(0.42, 0.105),
    texScreen: screenTexture(cfg),
    texCracked: screenTexture(cfg, { cracked: true }),
    texEngr: engravingTexture(cfg),
  };
  return shared;
}

export function createPhone(cfg, { variant = 'hero', internals = false } = {}) {
  const A = sharedAssets(cfg);
  const { W, H, D } = PHONE;
  const V = VARIANTS[variant];
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const frameMat = new THREE.MeshPhysicalMaterial({
    color: V.frame, metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.15, envMapIntensity: 1.25,
  });
  const blackGlass = new THREE.MeshPhysicalMaterial({
    color: '#020303', metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#000000', emissive: '#ffffff', emissiveMap: A.texScreen, emissiveIntensity: 1.2, roughness: 0.06, metalness: 0,
    envMapIntensity: 0.9,
  });
  const backMat = new THREE.MeshPhysicalMaterial({
    color: V.back, metalness: 0.35, roughness: V.backRough, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 1.1,
  });
  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#04060c', metalness: 0.5, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
  });

  // --- Cadre
  const frame = new THREE.Mesh(A.body, frameMat);
  inner.add(frame);
  const buttons = new THREE.Group();
  [[-1, 0.42, 0.05], [-1, 0.28, 0.12], [-1, 0.13, 0.12], [1, 0.3, 0.17]].forEach(([side, y, len]) => {
    const b = new THREE.Mesh(A.button, frameMat);
    b.scale.y = len / 0.12;
    b.position.set(side * (W / 2 + 0.002), y, 0);
    buttons.add(b);
  });
  frame.add(buttons);

  // --- Face avant : verre noir + écran émissif
  const front = new THREE.Group();
  const glass = new THREE.Mesh(A.glass, blackGlass);
  glass.position.z = D / 2 + 0.0008;
  const screen = new THREE.Mesh(A.screen, screenMat);
  screen.position.z = D / 2 + 0.0016;
  front.add(glass, screen);
  inner.add(front);

  // --- Dos : verre givré, module photo, gravure
  const back = new THREE.Group();
  const backGlass = new THREE.Mesh(A.glass, backMat);
  backGlass.rotation.y = Math.PI;
  backGlass.position.z = -D / 2 - 0.0008;
  back.add(backGlass);
  const cam = new THREE.Group();
  const plate = new THREE.Mesh(A.plate, new THREE.MeshPhysicalMaterial({
    color: V.back, metalness: 0.5, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3,
  }));
  plate.rotation.y = Math.PI;
  cam.add(plate);
  [[-0.072, 0.072], [-0.072, -0.072], [0.075, 0]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(A.lensRing, frameMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, -0.02);
    const lg = new THREE.Mesh(A.lensGlass, lensGlassMat);
    lg.rotation.x = Math.PI / 2;
    lg.position.set(x, y, -0.022);
    const eye = new THREE.Mesh(A.lensEye, lensGlassMat);
    eye.scale.z = 0.4;
    eye.position.set(x, y, -0.03);
    cam.add(ring, lg, eye);
  });
  const flash = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 24),
    new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#fff1c8', emissiveIntensity: 0.6, roughness: 0.2 }),
  );
  flash.rotation.y = Math.PI;
  flash.position.set(0.075, 0.1, -0.0135);
  cam.add(flash);
  // module en haut à gauche vu de dos (=> x positif en repère local)
  cam.position.set(W / 2 - 0.2, H / 2 - 0.2, -D / 2 - 0.001);
  back.add(cam);
  const engr = new THREE.Mesh(A.engr, new THREE.MeshBasicMaterial({
    map: A.texEngr, transparent: true, opacity: 0.38, depthWrite: false,
  }));
  engr.rotation.y = Math.PI;
  engr.position.set(0, -H * 0.36, -D / 2 - 0.0016);
  back.add(engr);
  inner.add(back);

  const layers = [
    { name: 'front', obj: front, off: new THREE.Vector3(0, 0.02, 0.95), rot: new THREE.Euler(0.05, -0.08, 0.02) },
    { name: 'frame', obj: frame, off: new THREE.Vector3(0, 0, 0), rot: new THREE.Euler(0, 0, 0) },
    { name: 'back', obj: back, off: new THREE.Vector3(0, 0, -1.25), rot: new THREE.Euler(-0.04, 0.1, -0.02) },
  ];
  const anchors = { front, back, frame };

  if (internals) {
    const dark = new THREE.MeshStandardMaterial({ color: '#0b0d0e', metalness: 0.4, roughness: 0.45 });
    const flexMat = new THREE.MeshStandardMaterial({
      color: '#0e3d1f', emissive: cfg.colors.neon, emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.4,
    });
    const steel = new THREE.MeshPhysicalMaterial({ color: '#c3c8cc', metalness: 1, roughness: 0.25, envMapIntensity: 1.2 });

    const display = new THREE.Group();
    const panel = new THREE.Mesh(new RoundedBoxGeometry(W - 0.05, H - 0.05, 0.008, 2, 0.003), dark);
    const flex = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.004), flexMat);
    flex.position.set(0.1, -H * 0.36, -0.006);
    display.add(panel, flex);
    display.position.z = 0.025;
    inner.add(display);

    const battery = new THREE.Mesh(
      new RoundedBoxGeometry(0.52, 0.86, 0.032, 2, 0.012),
      new THREE.MeshStandardMaterial({ map: batteryTexture(cfg), metalness: 0.35, roughness: 0.42 }),
    );
    battery.position.set(-0.04, -0.14, 0);
    inner.add(battery);

    const board = new THREE.Group();
    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.44, 0.012),
      new THREE.MeshStandardMaterial({ map: pcbTexture(cfg), metalness: 0.3, roughness: 0.5, emissive: '#0a3a18', emissiveIntensity: 0.3 }),
    );
    board.add(pcb);
    const chip = new THREE.BoxGeometry(1, 1, 1);
    [[-0.14, 0.08, 0.14, 0.14, dark], [0.1, 0.1, 0.12, 0.09, steel], [0.12, -0.1, 0.16, 0.1, steel], [-0.12, -0.12, 0.1, 0.08, dark], [0.0, -0.02, 0.06, 0.05, dark]].forEach(
      ([x, y, w, h, m]) => {
        const c = new THREE.Mesh(chip, m);
        c.scale.set(w, h, 0.014);
        c.position.set(x, y, 0.012);
        board.add(c);
      },
    );
    board.position.set(0.02, 0.5, 0);
    inner.add(board);

    const connector = new THREE.Group();
    const port = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.05, 0.036, 2, 0.015), steel);
    const slot = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.022, 0.04, 2, 0.008), new THREE.MeshBasicMaterial({ color: '#000' }));
    slot.position.y = -0.006;
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.004), flexMat);
    ribbon.position.set(0, 0.15, -0.012);
    connector.add(port, slot, ribbon);
    connector.position.set(0, -H / 2 + 0.05, 0);
    inner.add(connector);

    layers.push(
      { name: 'display', obj: display, off: new THREE.Vector3(0, 0.0, 0.55), rot: new THREE.Euler(0.03, 0.05, 0) },
      { name: 'battery', obj: battery, off: new THREE.Vector3(-0.08, -0.02, -0.42), rot: new THREE.Euler(-0.05, 0.12, 0.04) },
      { name: 'board', obj: board, off: new THREE.Vector3(0.1, 0.22, -0.8), rot: new THREE.Euler(0.06, -0.1, -0.05) },
      { name: 'connector', obj: connector, off: new THREE.Vector3(0.05, -0.62, -0.18), rot: new THREE.Euler(0.4, 0.2, 0.1) },
    );
    Object.assign(anchors, { display, battery, board, connector });
  }
  for (const l of layers) {
    l.base = l.obj.position.clone();
    l.baseRot = l.obj.rotation.clone();
  }

  return {
    group,
    inner,
    layers,
    anchors,
    screenMat,
    /** Branche une texture d'écran vivante (voir world/screens.js). */
    setScreenMap(tex, intensity = 1.2) {
      if (screenMat.emissiveMap !== tex) {
        screenMat.emissiveMap = tex;
        screenMat.needsUpdate = true;
      }
      screenMat.emissiveIntensity = intensity;
    },
    setCracked(c) {
      const tex = c ? A.texCracked : A.texScreen;
      if (screenMat.emissiveMap !== tex) {
        screenMat.emissiveMap = tex;
        screenMat.needsUpdate = true;
      }
    },
    setExplode(p, t) {
      layers.forEach((l, i) => {
        const wob = p * 0.035;
        l.obj.position.set(
          l.base.x + l.off.x * p + noise1(t * 0.9 + i * 7) * wob,
          l.base.y + l.off.y * p + noise1(t * 0.8 + i * 13) * wob,
          l.base.z + l.off.z * p,
        );
        l.obj.rotation.set(
          l.baseRot.x + l.rot.x * p + noise1(t * 0.6 + i * 3) * wob * 2,
          l.baseRot.y + l.rot.y * p,
          l.baseRot.z + l.rot.z * p,
        );
      });
    },
  };
}

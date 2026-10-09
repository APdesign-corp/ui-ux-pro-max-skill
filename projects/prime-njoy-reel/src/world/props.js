// Objets 3D de l'offre Prime N'Joy (d'après l'affiche) : TV écran dégradé + logo, box internet
// noire laquée avec LED Wi-Fi, et le smartphone existant ré-habillé aux couleurs de la marque.

import * as THREE from 'three';
import { roundedRectShape, fitUVs } from './phone.js';
import { canvasTexture } from './textures.js';
import { ringDots, drawScreen, ICONS, brandGradient } from './brand.js';

export function createProps(cfg, phone) {
  const dots = ringDots(7);
  const group = new THREE.Group();

  // ---- TV
  const tv = new THREE.Group();
  const TW = 2.4, TH = 1.38;
  const bezelMat = new THREE.MeshPhysicalMaterial({ color: '#0c0d12', metalness: 0.4, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(TW, TH, 0.03), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }), bezelMat);
  bezel.position.z = -0.06;
  const scrTex = canvasTexture(1600, 920, (g, w, h) => drawScreen(g, w, h, dots, { logoR: 0.2, logoY: 0.4 }));
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, transparent: true });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.05, TH - 0.05), scrMat);
  screen.position.z = 0.002;
  // reflet vitre
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.05, TH - 0.05), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0, clearcoat: 1 }));
  glass.position.z = 0.006;
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.3), bezelMat);
  stand.position.set(0, -TH / 2 - 0.09, 0);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.04), bezelMat);
  neck.position.set(0, -TH / 2 - 0.04, -0.03);
  tv.add(bezel, screen, glass, stand, neck);
  tv.userData = { screenMat: scrMat };

  // ---- Box internet
  const box = new THREE.Group();
  const boxMat = new THREE.MeshPhysicalMaterial({ color: '#121319', metalness: 0.3, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(1.1, 0.42, 0.06), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4 }), boxMat);
  body.position.z = -0.35;
  const ledTex = canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineWidth = 16; g.lineCap = 'round';
    g.strokeStyle = g.fillStyle = brandGradient(g, 0, 0, w, h);
    ICONS.wifi(g, w / 2, h / 2, w * 0.7);
  });
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), ledMat);
  led.position.set(0, 0.02, 0.376);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color('#1fa2e6').multiplyScalar(2), toneMapped: false }));
  strip.position.set(0, -0.17, 0.377);
  box.add(body, led, strip);
  box.userData = { ledMat };

  // ---- smartphone aux couleurs de la marque
  const phTex = canvasTexture(900, 1960, (g, w, h) => drawScreen(g, w, h, dots, { logoR: 0.3, logoY: 0.36 }));
  phone.screenMat.emissiveMap = phTex;
  phone.screenMat.needsUpdate = true;

  group.add(tv, box);
  return {
    group, tv, box, dots,
    hideAll() { tv.visible = false; box.visible = false; },
  };
}
void fitUVs;

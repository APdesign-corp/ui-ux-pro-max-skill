// Carte du monde abstraite en matrice de points (données Natural Earth via world-atlas),
// posée en 3D comme une table lumineuse. Les arcs de transfert partent de Liège.

import * as THREE from 'three';
import { feature } from 'topojson-client';
import { MapShader } from '../engine/shaders.js';

export const MAP = { W: 8, H: 4 }; // plan équirectangulaire 2:1 (unités monde)
export const LIEGE = [5.5797, 50.6326]; // lon, lat — adresse de la boutique (Rue St Léonard, Liège)

// Points de destination génériques (non nommés à l'écran) pour figurer le réseau international
export const DESTINATIONS = [
  [-7.6, 33.6], [15.3, -4.3], [-17.4, 14.7], [3.4, 6.5], [29.0, 41.0], [72.8, 19.0],
  [-46.6, -23.5], [-74.0, 40.7], [3.0, 36.7], [9.7, 4.0], [121.0, 14.6], [26.1, 44.4],
  [31.2, 30.0], [-99.1, 19.4], [36.8, -1.3], [90.4, 23.8],
];

export function lonLatToLocal([lon, lat]) {
  return new THREE.Vector3((lon / 180) * (MAP.W / 2), (lat / 90) * (MAP.H / 2), 0);
}

export async function createWorldMap(cfg) {
  const topo = await (await fetch('node_modules/world-atlas/land-110m.json')).json();
  const land = feature(topo, topo.objects.land);

  // Masque des terres (équirectangulaire)
  const mw = 2048, mh = 1024;
  const mask = document.createElement('canvas');
  mask.width = mw;
  mask.height = mh;
  const mg = mask.getContext('2d', { willReadFrequently: true });
  mg.fillStyle = '#fff';
  const proj = ([lon, lat]) => [((lon + 180) / 360) * mw, ((90 - lat) / 180) * mh];
  const drawPoly = (rings) => {
    mg.beginPath();
    for (const ring of rings) {
      ring.forEach((c, i) => {
        const [x, y] = proj(c);
        i ? mg.lineTo(x, y) : mg.moveTo(x, y);
      });
      mg.closePath();
    }
    mg.fill('evenodd');
  };
  for (const f of land.features) {
    const g = f.geometry;
    if (g.type === 'Polygon') drawPoly(g.coordinates);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(drawPoly);
  }
  const md = mg.getImageData(0, 0, mw, mh).data;

  // Texture de points
  const tw = 4096, th = 2048;
  const dots = document.createElement('canvas');
  dots.width = tw;
  dots.height = th;
  const dg = dots.getContext('2d');
  dg.fillStyle = '#000';
  dg.fillRect(0, 0, tw, th);
  const step = 1.15; // degrés
  for (let lat = 84; lat > -58; lat -= step) {
    for (let lon = -180; lon < 180; lon += step) {
      const [mx, my] = proj([lon, lat]);
      if (md[((my | 0) * mw + (mx | 0)) * 4] < 128) continue;
      const x = ((lon + 180) / 360) * tw, y = ((90 - lat) / 180) * th;
      dg.fillStyle = '#fff';
      dg.beginPath();
      dg.arc(x, y, 4.2, 0, Math.PI * 2);
      dg.fill();
    }
  }
  const tex = new THREE.CanvasTexture(dots);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;

  const mat = new THREE.ShaderMaterial({
    ...MapShader,
    uniforms: THREE.UniformsUtils.clone(MapShader.uniforms),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  mat.uniforms.tDots.value = tex;
  mat.uniforms.uColor.value = new THREE.Color('#5d8f6b');
  mat.uniforms.uHot.value = new THREE.Color(cfg.colors.neon);
  mat.uniforms.uOrigin.value = [(LIEGE[0] + 180) / 360, (LIEGE[1] + 90) / 180];

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(MAP.W, MAP.H), mat);
  const group = new THREE.Group();
  group.add(plane);
  group.rotation.x = -Math.PI / 2; // à plat (local +z = vers le haut)
  return { group, plane, mat };
}

// Arc 3D entre deux points locaux, en cloche au-dessus de la carte
export function arcPoints(a, b, n = 48) {
  const d = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.z = d * 0.32 + 0.05;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3(
      (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x,
      (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y,
      (1 - t) * (1 - t) * a.z + 2 * (1 - t) * t * mid.z + t * t * b.z,
    );
    pts.push(p);
  }
  return pts;
}

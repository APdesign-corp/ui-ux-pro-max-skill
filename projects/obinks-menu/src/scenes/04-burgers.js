// VITRINE PROVISOIRE (agent Food 3D) — à remplacer par l'agent burgers.
// Montre tous les produits de src/world/food.js : assemblés, puis éclatés (vue éclatée), puis
// réassemblés, page par page, avec les étiquettes d'ingrédients accrochées aux anchors.
import { createFood, createFoodLights } from '../world/food.js';
import { E, clamp, seg } from '../core/anim.js';
import { C } from '../core/type.js';

export const cues = [
  { t: 0.05, type: 'whoosh', dur: 0.4 }, { t: 1.6, type: 'impact', gain: 0.6 },
  { t: 2.8, type: 'whoosh', dur: 0.4 }, { t: 4.35, type: 'impact', gain: 0.6 },
  { t: 5.55, type: 'whoosh', dur: 0.4 }, { t: 7.1, type: 'impact', gain: 0.6 },
  { t: 8.3, type: 'whoosh', dur: 0.4 }, { t: 9.85, type: 'impact', gain: 0.6 },
];

const PAGES = [
  [['burger', { id: 'ocheesy' }], ['burger', { id: 'doublesmash' }], ['burger', { id: 'raclette' }], ['burger', { id: 'ocrispy' }]],
  [['burger', { id: 'opepper' }], ['burger', { id: 'chevremiel' }], ['burger', { id: 'barbecue' }], ['burger', { id: 'bigbinks' }]],
  [['sandwich', { id: 'doublesmash' }], ['sandwich', { id: 'chevremiel' }], ['tacos', { meat: 'tenders' }], ['hotdog', {}]],
  [['crousty', {}], ['kapsalone', { meat: 'poulet' }], ['tiramisu', { flavor: 'oreo' }], ['milkshake', { flavor: 'fraisebanane' }]],
];
const PAGE_DUR = 2.75;

export default function create(ctx) {
  const { THREE, V } = ctx;
  const group = new THREE.Group();
  // éclairage de test : key chaude + contre-jour rouge + débouchage doux
  group.add(createFoodLights());
  const pages = PAGES.map((items) => {
    const pg = new THREE.Group();
    const foods = items.map(([kind, recipe], i) => {
      const f = createFood(kind, recipe);
      const holder = new THREE.Group();
      holder.add(f.group);
      const s = 1 / Math.max(f.width, f.height * 0.9, 0.9);
      holder.scale.setScalar(s);
      if (V) holder.position.set((i % 2 ? 0.75 : -0.75), i < 2 ? 1.25 : -1.15, 0);
      else holder.position.set(-2.4 + i * 1.6, -0.45, 0);
      f.group.position.y = 0;
      pg.add(holder);
      return { f, holder, s };
    });
    group.add(pg);
    return { pg, foods };
  });
  const v = new THREE.Vector3();
  return {
    group,
    camera(lt) {
      return V ? { pos: [0, 0.6, 9.4], target: [0, 0.05, 0], roll: 0, fov: 30 } : { pos: [0, 1.2, 7.4], target: [0, 0.15, 0], roll: 0, fov: 30 };
    },
    update(f) {
      const pi = Math.min(PAGES.length - 1, Math.floor(f.lt / PAGE_DUR));
      const lp = (f.lt - pi * PAGE_DUR) / PAGE_DUR;
      const p = E.inOutCubic(seg(lp, 0.12, 0.42)) * (1 - E.inOutCubic(seg(lp, 0.78, 0.95)));
      pages.forEach((P, i) => { P.pg.visible = i === pi; });
      const { foods } = pages[pi];
      const g = f.ui;
      g.textAlign = 'left'; g.textBaseline = 'middle';
      foods.forEach(({ f: food, holder }, i) => {
        holder.rotation.y = -0.35 + 0.25 * Math.sin(f.lt * 0.6 + i);
        holder.rotation.x = 0.12;
        food.group.position.y = -food.explodedHeight(1) * 0.5 * p * 0 ;
        food.setExplode(p, f.t, { spread: 1, stagger: 0.3 });
        if (p > 0.6) {
          const a = clamp((p - 0.6) / 0.3);
          for (const l of food.layers) {
            if (l.minor) continue;
            food.anchors[l.name].getWorldPosition(v);
            const [x, y] = f.project([v.x, v.y, v.z]);
            g.globalAlpha = a;
            g.fillStyle = C.yellow; g.beginPath(); g.arc(x, y, 3 * f.u, 0, Math.PI * 2); g.fill();
            g.font = `${Math.round(15 * f.u)}px Oswald`; g.fillStyle = '#fff';
            g.fillText(l.label, x + 6 * f.u, y);
          }
          g.globalAlpha = 1;
        }
      });
      f.post.bloom = 0.45;
    },
  };
}

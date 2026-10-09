// VITRINE PROVISOIRE (agent Food 3D) — à remplacer par l'agent burgers.
// Montre TOUS les produits procéduraux de src/world/food.js, 4 par page : ils apparaissent
// assemblés, s'éclatent en couches (vue éclatée) avec les étiquettes d'ingrédients accrochées aux
// anchors, puis se réassemblent avec un impact. Sert de banc d'essai visuel et d'exemple d'usage :
//   const food = createFood('burger', { id: 'ocheesy' });      // dans create()
//   food.setExplode(p, f.t, { spread, stagger });                // dans update()
//   food.anchors[layer.name].getWorldPosition(v); f.project(...) → étiquette 2D
import { createFood, createFoodLights } from '../world/food.js';
import { E, clamp, seg } from '../core/anim.js';
import { C } from '../core/type.js';
import { brushTitle, streetBackdrop } from '../core/obinks.js';

// pages calées sur les temps (120 BPM : 0,5 s) — début de page = whoosh, réassemblage = impact
const PAGES = [
  { t0: 0, dur: 3, items: [['burger', { id: 'ocheesy' }, "O'CHEESY"], ['burger', { id: 'doublesmash' }, 'DOUBLE SMASH'], ['burger', { id: 'raclette' }, 'RACLETTE'], ['burger', { id: 'ocrispy' }, "O'CRISPY"]] },
  { t0: 3, dur: 2.5, items: [['sandwich', { id: 'opepper' }, "O'PEPPER"], ['sandwich', { id: 'chevremiel' }, 'CHÈVRE MIEL'], ['sandwich', { id: 'barbecue' }, 'BARBECUE'], ['burger', { id: 'bigbinks' }, 'BIG BINKS']] },
  { t0: 5.5, dur: 3, items: [['tacos', { meat: 'tenders' }, 'TACOS'], ['hotdog', {}, 'HOT DOG'], ['crousty', {}, 'CROUSTY BINKS'], ['kapsalone', { meat: 'poulet' }, 'KAPSALONE']] },
  { t0: 8.5, dur: 2.5, items: [['tiramisu', { flavor: 'speculoos' }, 'TIRAMISU'], ['milkshake', { flavor: 'fraisebanane' }, 'MILKSHAKE'], ['milkshake', { flavor: 'oreo' }, 'MILKSHAKE'], ['tiramisu', { flavor: 'oreo' }, 'TIRAMISU']] },
];
const IN = 0.3, EX0 = 0.35, EX1 = 0.95, RE = 0.75, HIT = 0.35, OUT = 0.14;

export const cues = PAGES.flatMap(({ t0, dur }) => [
  { t: t0 + 0.01, type: 'whoosh', dur: 0.3, gain: 0.7 },
  { t: t0 + EX0, type: 'swish', gain: 0.6 },
  { t: t0 + dur - HIT, type: 'impact', gain: 0.55 },
]);

export default function create(ctx) {
  const { THREE, V, world } = ctx;
  const group = new THREE.Group();
  // éclairage conseillé (key chaude + contre-jour rouge + débouchage) : voir createFoodLights
  group.add(createFoodLights());
  const logo = world.images?.logo?.img;
  // grille : 16:9 → 4 colonnes, étiquettes à droite ; 9:16 → 2 × 2
  const SPREAD = V ? 0.8 : 1;
  const cellW = V ? 1.27 : 1.5, prodW = V ? 0.7 : 0.95, maxH = V ? 1.25 : 2.85;
  const cells = V
    ? [[-0.64, 1.14], [0.64, 1.14], [-0.64, -0.5], [0.64, -0.5]].map(([x, y]) => [x - 0.2, y])
    : [0, 1, 2, 3].map((i) => [-3.17 + 0.08 + prodW / 2 + i * cellW, 0.12]);
  const pages = PAGES.map((pg) => {
    const g = new THREE.Group();
    const foods = pg.items.map(([kind, recipe, name], i) => {
      const food = createFood(kind, kind === 'crousty' ? { ...recipe, logo } : recipe);
      const s = Math.min(prodW / Math.max(food.width, food.depth * 0.8), maxH / food.explodedHeight(SPREAD));
      const holder = new THREE.Group();
      holder.add(food.group);
      food.group.position.y = -food.height / 2; // centre du produit assemblé à l'origine du holder
      holder.scale.setScalar(s);
      holder.position.set(cells[i][0], cells[i][1], 0);
      g.add(holder);
      const labels = food.layers.filter((l) => !l.minor);
      return { food, holder, s, name, labels, nameY: cells[i][1] - maxH / 2 - (V ? 0.06 : 0.1) };
    });
    group.add(g);
    return { ...pg, g, foods };
  });
  const v = new THREE.Vector3();
  return {
    group,
    camera(lt) {
      const sw = Math.sin(lt * 0.35) * 0.25;
      return V ? { pos: [sw, 1.5, 9.4], target: [0, 0.12, 0], roll: 0, fov: 30 } : { pos: [sw, 2.0, 7.3], target: [0, 0.08, 0], roll: 0, fov: 30 };
    },
    update(f) {
      const { u, W, H } = f;
      streetBackdrop(f.bg, W, H, f.t, { k: 0.45, lamps: V ? [0.14, 0.86] : [0.1, 0.5, 0.9] });
      let pi = PAGES.length - 1;
      for (let i = 0; i < PAGES.length; i++) if (f.lt >= PAGES[i].t0) pi = i;
      pages.forEach((P, i) => { P.g.visible = i === pi; });
      const P = pages[pi];
      const lt = f.lt - P.t0, D = P.dur;
      // éclatement : s'ouvre, tient, se referme (impact à D − HIT)
      const open = E.inOutCubic(seg(lt, EX0, EX1));
      const close = E.inCubic(seg(lt, D - RE, D - HIT));
      const p = open * (1 - close);
      const hit = Math.exp(-Math.max(0, lt - (D - HIT)) / 0.12) * (lt >= D - HIT ? 1 : 0);
      const g = f.ui;
      P.foods.forEach(({ food, holder, s, name, labels, nameY }, i) => {
        const pin = E.outBack(seg(lt, i * 0.05, IN + i * 0.05));
        const pout = 1 - E.inQuad(seg(lt, D - OUT, D));
        const k = s * pin * pout * (1 + 0.05 * hit);
        holder.scale.set(k, k * (1 - 0.06 * hit), k);
        holder.rotation.set(0.12, -0.45 + 0.35 * Math.sin(f.t * 0.7 + i * 1.7), 0);
        food.setExplode(p, f.t, { spread: SPREAD, stagger: 0.3 });
        // nom du produit (brush) sous la cellule
        const [nx, ny] = f.project([holder.position.x, nameY, 0]);
        brushTitle(g, name, nx, ny, { size: (V ? 30 : 34) * u, align: 'center', p: clamp(seg(lt, 0.05 + i * 0.05, 0.45 + i * 0.05)), glow: 0.5 });
        // étiquettes d'ingrédients (bord droit de chaque couche)
        const a = clamp((p - 0.55) / 0.3) * pout;
        if (a <= 0) return;
        g.save();
        g.globalAlpha = a;
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.font = `500 ${Math.round((V ? 15 : 16) * u)}px Oswald`;
        g.lineWidth = 1.5 * u;
        for (const l of labels) {
          food.anchors[l.name].getWorldPosition(v);
          const [x, y] = f.project([v.x, v.y, v.z]);
          g.strokeStyle = 'rgba(255,255,255,0.7)';
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12 * u, y); g.stroke();
          g.fillStyle = C.yellow; g.beginPath(); g.arc(x, y, 3.2 * u, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(l.label, x + 16 * u + 1.5 * u, y + 1.5 * u);
          g.fillStyle = '#fff'; g.fillText(l.label, x + 16 * u, y);
        }
        g.restore();
      });
      f.post.bloom = 0.42;
      f.post.vignette = 1.1;
    },
  };
}

// PROTOTYPE (test visuel)
import { createFood, createFoodLights } from '../world/food.js';
import { photo, streetBackdrop } from '../core/obinks.js';
import { seg } from '../core/anim.js';
export const cues = [];
export default function create(ctx) {
  const { THREE, world, W, H } = ctx;
  const group = new THREE.Group();
  group.add(createFoodLights({ key: 1.15, rim: 1, fill: 1.1 }));
  const food = createFood('kapsalone', { meat: 'poulet' });
  const holder = new THREE.Group(); holder.add(food.group); group.add(holder);
  food.group.position.y = -food.explodedHeight(1.2) / 2;
  holder.position.set(-0.9, 0, 0);
  const s = 2.3 / food.explodedHeight(1.2); holder.scale.setScalar(s);
  return {
    group,
    camera() { return { pos: [0, 1.1, 5], target: [0, 0, 0], roll: 0, fov: 35 }; },
    update(f) {
      streetBackdrop(f.bg, W, H, f.t, { k: 0.6, lamps: [0.9] });
      food.setExplode(seg(f.lt, 0.5, 2), f.t, { spread: 1.2 });
      holder.rotation.set(0.25, f.lt * 0.4 - 0.5, 0);
      photo(f.ui, world.images.kapsalone, W * 0.75, H * 0.5, { h: H * 0.9 });
    },
  };
}

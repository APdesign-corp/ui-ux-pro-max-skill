// SEGMENT PROVISOIRE (à remplacer) : un téléphone au centre, caméra fixe.
export const cues = [];
export default function create(ctx) {
  const { world, V } = ctx;
  return {
    camera(lt) { return { pos: [0, 0, V ? 4.2 : 3.6], target: [0, 0, 0], roll: 0, fov: 35 }; },
    update(f) {
      const p = world.phones[0];
      p.group.visible = true;
      p.group.rotation.y = 0.4 + f.lt * 0.6;
      p.screen.draw('home', f.lt);
    },
  };
}

// SEGMENT PROVISOIRE (à remplacer)
export const cues = [];
export default function create(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  return {
    group,
    camera() { return { pos: [0, 0, 5], target: [0, 0, 0], roll: 0, fov: 35 }; },
    update(f) {
      f.ui.font = `120px Anton`; f.ui.fillStyle = '#fff'; f.ui.textAlign = 'center';
      f.ui.fillText(f.seg.id.toUpperCase(), f.W / 2, f.H / 2);
    },
  };
}

// ============================================================================
//  O'BINKS — « Taste the difference » : publicité motion design du menu, 60 i/s
//  Palette et textes : uniquement ceux des captures du menu (voir FACTS.md).
//  Surcharges par URL : ?format=9x16 ?w=1920&h=1080 ?fps=60 ?t=12.5 ?vfx=0.8
// ============================================================================

export const CONFIG = {
  brand: { name: "O'BINKS", slogan: 'TASTE THE DIFFERENCE' },

  colors: {
    bg: '#0a0a0b',          // noir profond
    neon: '#ff2a2a',        // rouge néon (contours, glow)
    neon2: '#ff4d3d',       // rouge clair
    teal: '#ffc21a',        // (nom historique du moteur) = JAUNE des prix et accents
    red: '#e3141b',         // rouge peinture / étiquettes
    deepRed: '#5a0508',     // rouge sombre (ombres, fumée colorée)
    white: '#ffffff',
    muted: '#b9b2ad',
    metal: '#c9c9c9',
    metalDark: '#555',
    badgeInk: '#140203',
    deep: '#1a0304',
  },

  font: {
    display: 'Anton',            // titres condensés gras (TACOS, SANDWICH, prix)
    brush: 'Permanent Marker',   // lettrage brush / graffiti (Crousty, Tex-Mex…)
    comic: 'Bangers',            // titres « street » alternatifs
    script: 'Kaushan Script',    // accroches manuscrites (« Viande et sauce au choix »)
    ui: 'Oswald',                // listes, détails
  },

  video: { width: 1920, height: 1080, fps: 60, format: '16x9' },

  safe: {
    h: { x: 0.05, top: 0.05, bottom: 0.05 },
    v: { x: 0.05, top: 250 / 1920, bottom: 450 / 1920 },
  },

  vfx: {
    intensity: 1,
    particles: 1,
    bloom: { strength: 0.6, radius: 0.5, threshold: 0.78 },
    fxGain: 1.15,
    chromatic: 0.0008,
    grain: 0.045,
    scanlines: 0,
    vignette: 1.0,
    edgeBlur: 0.8,
    motionBlur: 1,
    shutter: 1.0,
    dof: true,
    glitch: 1,
    flares: 1,
    msaa: 0,
    fxaa: true,
  },
};

export function resolveConfig(search = '') {
  const q = new URLSearchParams(search);
  const cfg = structuredClone(CONFIG);
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
  cfg.video.format = q.get('format') || cfg.video.format;
  if (cfg.video.format === '9x16' && !q.has('w')) { cfg.video.width = 1080; cfg.video.height = 1920; }
  cfg.video.width = num('w', cfg.video.width);
  cfg.video.height = num('h', cfg.video.height);
  cfg.video.fps = num('fps', cfg.video.fps);
  cfg.vfx.intensity = num('vfx', cfg.vfx.intensity);
  cfg.vfx.particles = num('particles', cfg.vfx.particles);
  if (q.has('dof')) cfg.vfx.dof = q.get('dof') !== '0';
  if (q.has('bloom')) cfg.vfx.bloom.strength = num('bloom', cfg.vfx.bloom.strength);
  if (q.has('mb')) cfg.vfx.motionBlur = num('mb', 1);
  cfg.render = q.has('render');
  cfg.startAt = num('t', 0);
  cfg.vertical = cfg.video.format === '9x16';
  return cfg;
}

// ============================================================================
//  AP DESIGN — Reel Instagram / TikTok « TU SCROLLES. TU VOIS. TU RESTES. »
//  Configuration centrale (variables) : logo/marque, couleurs, textes, durée/vitesse,
//  VFX (intensité, particules), CTA, résolution, FPS. Musique & VO : voir README.
//  Surcharges possibles par URL : ?w=3840&h=2160&fps=30&format=9x16&vfx=0.8&speed=1&t=12.5
// ============================================================================

export const CONFIG = {
  // Aucune charte AP Design fournie : direction premium (noir profond, blanc, métal, accent lumineux).
  brand: {
    name: 'AP DESIGN',
    mono: 'AP',
    word: 'DESIGN',
    nameSplit: 2,
    badgeLetter: 'A',
    tagline: ['TON PROJET. ', 'NOTRE CRÉATIVITÉ.'],
    handle: 'AP DESIGN',
    services: 'MOTION DESIGN • 3D • VFX',
  },

  texts: {
    // texte exact de la voix off : les sous-titres cinétiques à l'écran suivent ces mots
    vo: {
      L1: "Tu veux vraiment qu'on remarque tes vidéos ?",
      L2: 'Alors arrête le contenu banal.',
      L4: 'On transforme tes idées en images qui arrêtent le scroll.',
      L5: "Ça, c'est AP Design.",
      L6a: 'Tu veux la prochaine ?',
      L6c: 'Et pour collaborer…',
    },
    hook: ['TU VEUX DES VIDÉOS', 'COMME ÇA ?'],
    hero: 'MOTION DESIGN',
    kinetic: ['3D', 'VFX'],
    scroll: ['DES VIDÉOS QUI', 'ARRÊTENT LE', 'SCROLL'],
    follow: '+ SUIVRE',
    cta: 'DM POUR COLLABORER',
    notifTitle: 'Nouveau message',
    notifBody: 'On a un projet pour vous.',
  },

  colors: {
    bg: '#030304',
    neon: '#7b61ff',       // accent lumineux (violet électrique) — modifiable
    neon2: '#a594ff',      // accent clair
    teal: '#4fd8ff',       // accent secondaire (froid)
    white: '#f5f5f7',
    muted: '#9a9aa6',
    metal: '#b2b8be',
    metalDark: '#5f666c',
    badgeInk: '#08060f',
  },

  font: { family: 'Space Grotesk' },

  video: {
    width: 2160,
    height: 3840,
    fps: 30,               // 24 ou 30
    format: '9x16',        // Reel vertical (2160×3840)
  },

  timing: {
    speed: 1,              // > 1 accélère toute la pub (ex. 1.1)
  },

  vfx: {
    intensity: 1,          // multiplicateur global de tous les VFX (0.5 = sobre, 1.3 = spectaculaire)
    particles: 1,          // densité des particules
    bloom: { strength: 0.75, radius: 0.45, threshold: 0.72 },
    fxGain: 1.2,          // luminosité HDR des calques lumineux 2D (lignes, particules)
    chromatic: 0.0009,     // aberration chromatique de base (très légère)
    grain: 0.035,
    scanlines: 0.028,
    vignette: 0.9,
    motionBlur: 1,         // intensité des flous de mouvement (whip pans, zooms)
    dof: true,             // profondeur de champ (rack focus) sur les scènes 3D
    glitch: 1,
    flares: 1,
    msaa: 0,               // MSAA 3D (0 recommandé avec SwiftShader : artefacts) — FXAA appliqué à la place
    fxaa: true,
  },
};

export function resolveConfig(search = '') {
  const q = new URLSearchParams(search);
  const cfg = structuredClone(CONFIG);
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
  cfg.video.format = q.get('format') || cfg.video.format;
  if (cfg.video.format === '9x16' && !q.has('w')) {
    cfg.video.width = 2160; cfg.video.height = 3840;
  }
  cfg.video.width = num('w', cfg.video.width);
  cfg.video.height = num('h', cfg.video.height);
  cfg.video.fps = num('fps', cfg.video.fps);
  cfg.timing.speed = num('speed', cfg.timing.speed);
  cfg.vfx.intensity = num('vfx', cfg.vfx.intensity);
  cfg.vfx.particles = num('particles', cfg.vfx.particles);
  if (q.has('dof')) cfg.vfx.dof = q.get('dof') !== '0';
  if (q.has('bloom')) cfg.vfx.bloom.strength = num('bloom', cfg.vfx.bloom.strength);
  if (q.has('msaa')) cfg.vfx.msaa = num('msaa', 4);
  cfg.render = q.has('render');
  cfg.startAt = num('t', 0);
  return cfg;
}

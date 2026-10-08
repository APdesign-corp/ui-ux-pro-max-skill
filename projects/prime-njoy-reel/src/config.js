// ============================================================================
//  PRIME N'JOY — Reel motion design (MAQUETTE filigranée tant que non payée)
//  Configuration centrale (variables) : logo/marque, couleurs, textes, durée/vitesse,
//  VFX (intensité, particules), CTA, résolution, FPS. Musique & VO : voir README.
//  Surcharges possibles par URL : ?w=3840&h=2160&fps=30&format=9x16&vfx=0.8&speed=1&t=12.5
// ============================================================================

export const CONFIG = {
  // Charte Prime N'Joy (d'après le logo et l'affiche fournis) : dégradé cyan → bleu → violet → magenta → orange
  brand: {
    name: "PRIME N'JOY",
    first: 'PRIME',
    second: "N'JOY",
    tagline: 'ENSEMBLE, ALLONS PLUS LOIN',
    headline: ["Plus qu'une", 'connexion,', 'un meilleur', 'quotidien.'],
    sectors: ['TÉLÉCOM', 'ÉNERGIE'],
  },

  offer: { price: '45€', per: '/mois', bundle: 'TV + INTERNET + GSM', old: '86,99 €/mois', oldCount: 86.99, newCount: 45 },

  texts: {
    // texte exact de la voix off : les sous-titres cinétiques suivent ces mots
    vo: {
      L1a: 'Internet, télé, mobile…',
      L1b: 'Vous payez encore trop cher ?',
      L2: "Avec Prime N'Joy, tout est réuni.",
      L3a: 'La télé.', L3b: 'Internet.', L3c: 'Le GSM.',
      L5: "Plus qu'une connexion, un meilleur quotidien.",
    },
    products: ['TV', 'INTERNET', 'GSM'],
  },

  // MAQUETTE : filigrane anti-utilisation tant que la version n'est pas payée (?wm=0 = version définitive)
  watermark: { enabled: true, text: 'MAQUETTE', by: 'AP DESIGN', note: 'Aperçu non contractuel — diffusion interdite' },

  colors: {
    bg: '#f6f7fb',
    paper: '#ffffff',
    navy: '#0d1b5e',
    blue: '#1f3fbf',
    cyan: '#1fa2e6',
    royal: '#2456e0',
    purple: '#7b2fc4',
    magenta: '#e62f77',
    orange: '#ff6a1a',
    amber: '#ffb21a',
    // clés utilisées par le moteur (lumières, VFX globaux)
    neon: '#7b2fc4',
    neon2: '#b06cff',
    teal: '#1fa2e6',
    white: '#ffffff',
    muted: '#8a90a8',
    badgeInk: '#0d1b5e',
  },

  font: { family: 'Poppins' },

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
    grain: 0.025,
    scanlines: 0,
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
  if (q.has('wm')) cfg.watermark.enabled = q.get('wm') !== '0';
  cfg.render = q.has('render');
  cfg.startAt = num('t', 0);
  return cfg;
}

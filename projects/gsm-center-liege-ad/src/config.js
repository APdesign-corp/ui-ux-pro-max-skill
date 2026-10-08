// ============================================================================
//  GSM CENTER LIÈGE — Motion design publicitaire
//  Configuration centrale : couleurs, textes, durée, vitesse, VFX, résolution, FPS.
//  Tous les textes proviennent de source/FACTS.md (aucune donnée inventée).
//  Surcharges possibles par URL : ?w=3840&h=2160&fps=30&format=9x16&vfx=0.8&speed=1&t=12.5
// ============================================================================

export const CONFIG = {
  brand: {
    name: 'GSM CENTER',          // "GSM" en blanc, "CENTER" en vert néon
    nameSplit: 3,                // index de coupure blanc / vert
    city: 'LIÈGE',
    badgeLetter: 'G',
    // signature de la voix off (texte client) — 2e partie en vert ; slogan du site : ['Ton téléphone, ', 'notre spécialité.']
    tagline: ['Votre technologie, ', 'notre expertise.'],
    address: 'Rue St Léonard 203 — 4000 Liège',
    phone: '0484 65 60 61',
    open: 'OUVERT 7J/7',
    rating: '4,7★ · 155 avis Google',
    showRating: false,           // présent dans la source (JSON-LD) mais susceptible d'évoluer
  },

  texts: {
    stepPhones: '01 — CHOISIR',
    phones: 'SMARTPHONES',
    phonesSub: 'NEUFS & RECONDITIONNÉS',
    phonesPill: 'SMARTPHONES · NEUFS & RECONDITIONNÉS',
    stepRepair: '02 — RÉPARER',
    repair: 'RÉPARATION',
    repairSub: '& LIVRAISON',
    parts: ['ÉCRAN', 'BATTERIE', 'CONNECTEUR'],
    diagnostic: 'DIAGNOSTIC RAPIDE',
    stepGear: "03 — S'ÉQUIPER",
    services: ['INTERNET', 'MULTIMÉDIA', 'ACCESSOIRES'],   // ordre de la voix off
    gearSub: 'COQUES · CHARGEURS · ÉCOUTEURS',
    transfer: ['WESTERN UNION', 'RIA'],
    transferSub: "ENVOYEZ ET RECEVEZ DE L'ARGENT",
    cityLabel: 'LIÈGE',
    together: ['Tout ce dont vous avez besoin…', 'AU MÊME ENDROIT.'],
  },

  colors: {
    bg: '#040605',
    neon: '#39ff14',       // vert signature (site démo)
    neon2: '#4dff4d',      // vert du dégradé premium
    teal: '#14e0a0',       // fin de dégradé premium
    white: '#f4f8f4',
    muted: '#93a095',
    metal: '#b2b8be',
    metalDark: '#5f666c',
    badgeInk: '#021a0c',
  },

  font: { family: 'Space Grotesk' },

  video: {
    width: 3840,
    height: 2160,
    fps: 30,               // 24 ou 30
    format: '16x9',        // '16x9' | '9x16' (layouts adaptatifs)
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

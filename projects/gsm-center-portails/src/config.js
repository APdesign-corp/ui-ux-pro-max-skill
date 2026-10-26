// ============================================================================
//  GSM CENTER LIÈGE — « Portails » : publicité motion design 30 s, 60 i/s
//  Configuration centrale : couleurs, textes, formats, VFX.
//  PALETTE = EXACTEMENT celle de la première vidéo GSM Center (relevée sur le site du client,
//  voir FACTS.md) : fond #040605, vert néon #39ff14, dégradé #4dff4d → #14e0a0, blanc #f4f8f4,
//  gris #93a095, métal #b2b8be / #5f666c. AUCUNE autre teinte d'accent (pas de bleu, pas d'orange).
//  Textes : uniquement des informations présentes dans FACTS.md, ou des formules génériques.
//  Surcharges par URL : ?format=9x16 ?w=1920&h=1080 ?fps=60 ?t=12.5 ?vfx=0.8
// ============================================================================

export const CONFIG = {
  brand: {
    name: 'GSM CENTER',
    nameSplit: 3,                 // "GSM" blanc / "CENTER" vert néon (comme la 1re vidéo)
    city: 'LIÈGE',
    badgeLetter: 'G',
    address: 'Rue St Léonard 203',
    zip: '4000 Liège',
    slogan: ['Ton téléphone, ', 'notre spécialité.'],   // h1 du site (FACTS.md)
    cta: 'PASSE EN BOUTIQUE',                            // appel à l'action générique (aucune promesse)
  },

  // Tous issus de FACTS.md (site du client) ou génériques
  texts: {
    latest: 'Les derniers smartphones.',           // étape 01 du site
    phones: 'SMARTPHONES',
    phonesSub: 'Neufs & reconditionnés',           // site
    search: 'Choisis ton smartphone',              // texte d'interface générique
    repair: 'RÉPARATION',
    repairSub: 'Réparation rapide',                // site
    parts: ['ÉCRAN', 'BATTERIE', 'CONNECTEUR'],    // site
    diagnostic: 'DIAGNOSTIC RAPIDE',               // site
    gear: ['COQUES', 'CHARGEURS', 'ÉCOUTEURS'],    // site
    gearSub: 'Accessoires & multimédia',           // site
    allInOne: ['Tout pour ton mobile,', 'au même endroit.'], // h2 du site
  },

  colors: {
    bg: '#040605',
    neon: '#39ff14',        // vert signature
    neon2: '#4dff4d',       // début du dégradé premium
    teal: '#14e0a0',        // fin du dégradé premium
    white: '#f4f8f4',
    muted: '#93a095',
    metal: '#b2b8be',
    metalDark: '#5f666c',
    badgeInk: '#021a0c',
    deep: '#06140b',        // vert nuit (dérivé assombri du néon, pour les dégradés de fond)
  },

  font: {
    display: 'Poppins',       // géométrique, très contrastée (200 fin / 800 gras)
    ui: 'Space Grotesk',      // police du site (interfaces dans les écrans, HUD)
  },

  video: {
    width: 1920,
    height: 1080,
    fps: 60,
    format: '16x9',           // '16x9' | '9x16'
  },

  // Zones de sécurité
  //  16:9 (télés du magasin) : 5 % sur chaque bord.
  //  9:16 (TikTok / Reels / Shorts) : rien d'important dans les 250 px du haut ni les 450 px du bas
  //  (valeurs pour 1080×1920, mises à l'échelle) + 5 % sur les côtés.
  safe: {
    h: { x: 0.05, top: 0.05, bottom: 0.05 },
    v: { x: 0.05, top: 250 / 1920, bottom: 450 / 1920 },
  },

  vfx: {
    intensity: 1,
    particles: 1,
    bloom: { strength: 0.65, radius: 0.5, threshold: 0.75 },
    fxGain: 1.25,
    chromatic: 0.0009,
    grain: 0.04,
    scanlines: 0.018,
    vignette: 0.95,
    edgeBlur: 1,             // léger flou de lentille sur les bords
    motionBlur: 1,           // flou de mouvement automatique (vitesse caméra) + manuel
    shutter: 1.0,            // 1 = obturateur 360° à 60 i/s (flou très présent)
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
  if (cfg.video.format === '9x16' && !q.has('w')) {
    cfg.video.width = 1080; cfg.video.height = 1920;
  }
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

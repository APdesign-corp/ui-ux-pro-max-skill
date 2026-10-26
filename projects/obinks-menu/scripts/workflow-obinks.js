export const meta = {
  name: 'obinks-motion',
  description: "O'BINKS : fondations (food 3D + assets/kit), 10 scènes, revues artistiques multi-tours, son, contrôle qualité",
  phases: [
    { title: 'Foundation', detail: 'food 3D vues éclatées · découpes photos + kit graphique' },
    { title: 'Build', detail: '5 agents, scènes par paires' },
    { title: 'Review', detail: '2 directeurs artistiques, plusieurs tours de correction' },
    { title: 'Sound', detail: 'musique + bruitages (friture, crunch…) synchronisés' },
    { title: 'QA', detail: 'contrôle qualité indépendant : prix, textes, zones sûres, raccords' },
  ],
}

const ROOT = '/home/user/ui-ux-pro-max-skill/projects/obinks-menu'
const REFS = 'Captures du menu (référence visuelle et textes) : ' + ROOT + '/assets/source/menu-1.png … menu-9.png (1 crousty+tacos, 2 desserts, 3 tex-mex+frites+boissons+sauces, 4 sandwich+hamburger, 5 hot dog, 6 kapsalone, 7 mojitos, 8 horaires+logo, 9 livraison).'

const COMMON = `Tu es réalisateur motion design 3D senior ET développeur Three.js/Canvas expert, spécialisé en pubs fast-food
appétissantes. Projet : ${ROOT} (pub du menu O'BINKS, 57 s, 60 i/s, 9:16 + 16:9 depuis le même code ; doit être
facturable 300-500 €). ${REFS}

Lis d'abord ${ROOT}/DIRECTION.md (bible) et ${ROOT}/FACTS.md (TOUS les textes et prix exacts). API : src/main.js,
src/core/{anim,draw,type}.js, src/engine/renderer.js (defaultPost), src/world/{studio,phone,screens}.js. Le skill
du projet .claude/skills/motiondesign/SKILL.md liste les pièges connus.

RÈGLES :
- Zéro faute de prix/texte : recopie depuis FACTS.md (format 10,00€). Pas d'adresse ni de téléphone inventés.
- Ne modifie que les fichiers de ton périmètre (indiqué dans ta mission). Fichiers partagés en lecture seule sauf mention.
- camera(lt) pure ; rien de créé dans update() ; cues pour chaque événement fort.
- Économe : stills petits (480×270 et 270×480), plusieurs instants par commande, assemblés en planches ffmpeg tile,
  une image Read par planche. Dossiers à toi : out/stills/<tonnom>, out/frames-<tonnom>. Ne tue JAMAIS de processus
  (pas de kill/pkill/killall). Ne lance jamais de rendu complet.
- À la fin : sauvegarde ton travail : cd ${ROOT} && git add <tes fichiers> && git commit -m "<message>" && git push -q
  origin claude/install-ui-ux-pro-max-skill-ukguaa (si « index.lock » : attends 5 s et réessaie ; si le push est refusé,
  git pull --rebase -q puis push). Termine les messages de commit par :
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
- REPRISE : une tentative précédente a été interrompue par la limite d'usage. Des fichiers de ton périmètre peuvent déjà
  exister et être bien avancés (assets/menu/*, src/world/food*.js, src/core/obinks.js…) : lis-les, garde ce qui est bon,
  termine et vérifie — ne repars pas de zéro.
- Termine par le rapport demandé.`

const REPORT = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    api: { type: 'string', description: 'API / ids exposés aux autres agents (si applicable)' },
    verified: { type: 'string' },
    remaining: { type: 'string' },
  },
  required: ['files', 'verified', 'remaining'],
}

// ------------------------------------------------------------------ FONDATIONS
const FOUNDATION = [
  {
    key: 'food3d',
    prompt: `MISSION : écrire src/world/food.js — produits 3D PROCÉDURAUX très appétissants avec VUES ÉCLATÉES.
API (documente-la en tête du fichier) :
  export function createFood(kind, recipe = {}) → { group, layers: [{ name, label, obj }], setExplode(p, t, opts), anchors: { [name]: THREE.Object3D }, height }
  - setExplode(0) = produit assemblé ; setExplode(1) = couches séparées verticalement (espacement régulier, légère
    rotation et flottement dépendant de t, aucune interpénétration) ; opts.spread multiplie l'écart.
  - layers[i].label = nom de l'ingrédient en français pour les étiquettes (ex. « Steak smashé », « Cheddar fondu »).
  - anchors[name] = point d'accroche pour une étiquette (bord droit de la couche).
kinds et recettes (alignées sur le menu, regarde les captures) :
  'burger' (pain rond brioché brillant avec sésame en InstancedMesh) et 'sandwich' (pain long) avec recipe.id ∈
   ocheesy (steak, cheddar, cornichons, oignons), doublesmash (2 steaks smashés, cheddar, salade, oignon rouge),
   raclette (steak, raclette fondue coulante, oignon rouge), ocrispy (poulet croustillant, salade, sauce blanche),
   opepper (steak, sauce poivre crémeuse), chevremiel (steak, rondelles de chèvre, miel, noix), barbecue (steak,
   sauce barbecue, oignons), bigbinks (3 steaks, double cheddar) ;
  'tacos' (galette grillée pliée avec quadrillage doré, frites, viande au choix recipe.meat ∈ nuggets|tenders|cordonbleu|tandoori, sauce fromagère qui coule) ;
  'hotdog' (pain, saucisse de poulet grillée, zigzags ketchup + moutarde-miel, oignon crispy, persil, cornichons) ;
  'crousty' (boîte noire ouverte « O'BINKS », riz, crème fraîche, sauce aigre-douce brillante, tenders panés) ;
  'kapsalone' (barquette alu, frites, cheddar fondu, viande, rondelles de tomate, oignon rouge, salade, sauce) ;
  'tiramisu' (verrine transparente : couches biscuit/crème/topping selon recipe.flavor ∈ bueno|oreo|raffaello|speculoos) ;
  'milkshake' (gobelet transparent, coulures, chantilly, topping selon recipe.flavor ∈ fraisebanane|oreo|bueno|speculoos|snickers|pistache|raffaello).
QUALITÉ : matériaux PBR (MeshPhysicalMaterial : clearcoat pour sauces/fromage, sheen pour pain), textures Canvas
procédurales créées une fois (croûte dorée, grain du steak, alvéoles du pain, pépins de tomate, nervures de salade
ondulée, panure des tenders en relief via normalMap/bumpMap), fromage avec coulures (géométrie déformée), salade en
feuille ondulée, oignon en anneaux, frites en InstancedMesh, gouttes de sauce. Éclairage fourni par les scènes ; teste
avec une lumière chaude (key) + contre-jour rouge. Performance : < 40 k triangles par produit, matériaux partagés.
TEST : tu peux utiliser TEMPORAIREMENT src/scenes/04-burgers.js comme vitrine (grille de tous les produits, assemblé
puis éclaté) pour rendre des stills ; laisse-y une vitrine propre (l'agent burgers la remplacera). Regarde le rendu,
compare aux captures et itère jusqu'à ce que ce soit vraiment appétissant (pas « plastique »).
Périmètre : src/world/food.js (+ src/world/food-*.js si besoin) et src/scenes/04-burgers.js (vitrine).`,
  },
  {
    key: 'assets',
    prompt: `MISSION : 1) DÉCOUPES des photos du menu et 2) KIT GRAPHIQUE de la marque.
1) Avec Python/PIL, découpe dans assets/source/menu-*.png (1170×2532) chaque visuel utile et écris
assets/menu/<id>.png + assets/menu/manifest.json ({ "<id>": { "file": "<id>.png", "w": .., "h": .., "src": "menu-N", "label": "…" } }).
Fond : les photos sont sur fond noir/sombre → produis un PNG RGBA dont l'alpha est un masque doux (fond sombre →
transparent, bords adoucis, rien de coupé net) ; n'inclus PAS les textes/prix du menu dans les découpes (on les
réécrit nous-mêmes), sauf le logo. ids obligatoires (ajoute-en si utile) :
logo (logo O'BINKS propre, capture 8, fond transparent), logo_slogan (logo + TASTE THE DIFFERENCE, capture 9 ou 5),
crousty (boîte), coca_cherry, tacos_nuggets, tacos_tenders, tacos_cordonbleu, tacos_tandoori, sauce_fromagere,
sauces_tacos (rangée de pots), sandwich_<id> et burger_<id> pour les 8 recettes (ocheesy, doublesmash, raclette,
ocrispy, opepper, chevremiel, barbecue, bigbinks), kapsalone (pile complète) + kapsalone_<couche> pour chaque couche
séparable (salade, oignon, tomate, cheddar, viande, frites/barquette — coupe des bandes horizontales propres),
hotdog (les deux), hotdog_ing_<1..5> (les 5 ronds), texmex_tenders, texmex_nuggets, texmex_wings, texmex_mozza,
texmex_camembert, texmex_jalapenos, frites_cheddar, frites_gaufrette, can_coca, can_oasis, can_lipton,
sauce_<nom> pour les 10 pots (brazil, toscane, cocktail, mayonnaise, ketchup, tartare, algerienne, andalouse,
samourai, americaine), tiramisu (groupe), milkshake_<parfum> pour les 7, crepes, gaufre, mojito_<parfum> pour les 5
(fraise, violette, original, pasteque, bubblegum), livraison (plateau : boîte, frites, milkshake), lampadaire.
Vérifie chaque découpe (planche contact des PNG sur fond gris et sur fond noir, une image Read).
2) Écris src/core/obinks.js : kit graphique réutilisable (Canvas 2D, déterministe, rapide), documenté en tête :
  brushStroke(g, x, y, w, h, {color, seed, p, angle})   trait de pinceau rouge animé (p 0→1 = balayage)
  splatter(g, x, y, r, {seed, p, color, drips})         éclaboussure de peinture rouge animée (+ coulures)
  brushTitle(g, text, x, y, {size, font, color, stroke, glow, p, align, skew})  titre brush/graffiti avec contour noir + glow
  priceTag(g, x, y, {price, label, size, p, color, align})  étiquette prix rouge à contour néon, prix jaune ou blanc ÉNORME
  neonFrame(g, x, y, w, h, {p, color, flicker, radius})  cadre néon rouge avec scintillement
  smoke(g, W, H, t, {k, seed, color, rise})              fumée/vapeur (sprites pré-calculés une fois, pas de bruit par pixel)
  streetBackdrop(g, W, H, t, {k, lamps, bricks, wet, parallax})  rue de nuit : mur de briques sombre, lampadaires rouges
      qui éclairent, halo rouge, sol mouillé avec reflets, à dessiner sur f.bg
  checkered(g, x, y, w, h, {p, skew})                    nappe à carreaux rouge/blanc (Crousty)
  particles(g, W, H, t, {kind: 'crumbs'|'sparks'|'embers', k, seed})  miettes / étincelles / braises
Garde la palette de DIRECTION.md (rouge néon, noir, blanc, jaune prix). TEST : tu peux utiliser TEMPORAIREMENT
src/scenes/01-intro.js comme vitrine du kit + des découpes (puis laisse une vitrine propre, l'agent intro la remplacera).
Périmètre : assets/menu/*, src/core/obinks.js, src/scenes/01-intro.js (vitrine).`,
  },
]

phase('Foundation')
const found = await parallel(FOUNDATION.map((f) => () =>
  agent(`${COMMON}\n\n${f.prompt}`, { label: `foundation:${f.key}`, phase: 'Foundation', schema: REPORT })))
log(`Fondations : ${found.filter(Boolean).length}/2`)

// ------------------------------------------------------------------ SCÈNES
const FOUND_INFO = `Rapports des fondations (API food 3D, ids des découpes, kit graphique) : ${JSON.stringify(found)}.
Lis src/world/food.js, src/core/obinks.js et assets/menu/manifest.json avant d'écrire.`

const BUILD = [
  { key: '01-02', files: 'src/scenes/01-intro.js (0→3.5 s) et src/scenes/02-crousty.js (3.5→8.5 s)', spec: `
INTRO : t=0 noir #0a0a0b + seedPoint au centre (raccord de boucle avec la fin). 0.3 s : rue de nuit qui s'allume
(lampadaires rouges qui clignotent puis s'allument, fumée). ~0.9 s IMPACT : le logo O'BINKS (world.images.logo) arrive en
écrasement avec une grosse ÉCLABOUSSURE de peinture rouge, onde de choc (post.shock), flash, glitch, braises ; 1.6 s
« TASTE THE DIFFERENCE » au pinceau (brushStroke + texte). Fin : transition vers Crousty (ex. trait de pinceau rouge
qui balaie tout l'écran).
CROUSTY : la boîte Crousty (photo + 3D createFood('crousty')) sur la nappe à carreaux, vapeur ; titre CROUSTY BINKS brush ;
VUE ÉCLATÉE : riz / crème fraîche / aigre douce / tenders qui se séparent avec étiquettes, puis se réassemblent (impact) ;
prix énorme 10,00€ + « BOISSON COMPRISE ! » + canette Coca cherry qui tombe avec bruit de canette ; suppléments en
cascade : SAUCE PIQUANTE 0,50€ · SAUCE CRÈME 0,50€ · TENDERS 1€. Cues sizzle/crunch/pop/fizz.` },
  { key: '03-04', files: 'src/scenes/03-tacos.js (8.5→13.5 s) et src/scenes/04-burgers.js (13.5→24.5 s, remplace la vitrine)', spec: `
TACOS : titre TACOS énorme ; les 4 viandes (NUGGETS / TENDERS / CORDON BLEU / POULET MARINÉ TANDOORI) en 4 tacos
(photos + étiquettes colorées comme sur le menu) qui défilent sur les temps ; VUE ÉCLATÉE d'un tacos 3D (galette, frites,
viande, fromage, sauce fromagère) ; prix TACOS L 8,00€ et TACOS XL 11,00€ « CHOIX ENTRE 2 VIANDES » ; SAUCE FROMAGÈRE qui
coule ; « CHOISIS TA SAUCE » avec rangée de pots.
BURGERS (11 s, cœur de la vidéo) : SANDWICH & HAMBURGER : les 8 recettes (O'CHEESY, DOUBLE SMASH, RACLETTE, O'CRISPY,
O'PEPPER, CHÈVRE MIEL, BARBECUE, BIG BINKS) une par une (~1.2 s chacune, sur les temps), chacune avec sa VUE ÉCLATÉE 3D
(burger rond ET/OU sandwich long) qui s'ouvre et se referme, nom en brush, prix SEUL / MENU exacts (FACTS §3) dans des
étiquettes néon ; caméra qui file d'un produit au suivant (scroll/zoom), lampadaires et fumée de rue en fond ; en fin de
segment, récap des 8 en grille (photos du menu) avec « SANDWICH OU HAMBURGER : MÊMES PRIX ». ` },
  { key: '05-06', files: 'src/scenes/05-kapsalone.js (24.5→28.5 s) et src/scenes/06-hotdog.js (28.5→31.5 s)', spec: `
KAPSALONE : la pile de la capture 6 est déjà une vue éclatée : anime les couches découpées (assets kapsalone_<couche>)
qui tombent une à une dans la barquette puis s'écartent (et/ou createFood('kapsalone')), fromage qui coule, vapeur ;
titre KAPSALONE, accroche « Viande et sauce au choix » (Kaushan Script, jaune), prix 10€ énorme, les 5 viandes avec
pictos et sous-titres exacts (FACTS §4) qui glissent une par une, « Fraîcheur, générosité et plaisir ! ».
HOT DOG : HOT DOG / SAVEUR & CROUSTY, VUE ÉCLATÉE (createFood('hotdog')) : pain, saucisse de poulet, zigzags de sauce,
oignon crispy, persil, cornichon, chaque ingrédient avec son rond (hotdog_ing_*) et son nom exact ; prix 5€ dans un
grand rond rouge comme sur l'affiche ; TASTE THE DIFFERENCE.` },
  { key: '07-08', files: 'src/scenes/07-texmex.js (31.5→38 s) et src/scenes/08-desserts.js (38→45.5 s)', spec: `
TEX-MEX : titre TEX-MEX graffiti ; 8 produits (photos) qui arrivent sur les temps dans des cadres néon avec prix exacts
(FACTS §6 : TENDERS les 3 5,00€ / les 6 8,00€ ; NUGGETS 6 pièces 4,50€ ; WINGS les 3 4,00€ / les 6 6,00€ ; MOZZA
STICK les 3 4,00€ ; CROQ CAMEMBERT les 3 4,50€ ; JALAPENOS CRÈME les 3 4,50€ ; FRITES CHEDDAR BACON 4,50€ ; FRITES
GAUFRETTE 4,00€), effets crunch (miettes qui volent), fromage qui file sur le mozza stick, friture.
DESSERTS : TIRAMISU 4,50€ avec VUE ÉCLATÉE de la verrine (createFood('tiramisu')) et 4 parfums (Bueno, Oreo, Raffaello,
Spéculoos) ; MILKSHAKE 5,00€ : les 7 gobelets (photos) en rangée qui défilent + un milkshake 3D éclaté en couches ;
CRÊPES 5,50€ (Nutella, Spéculoos, Oreo, Bueno) et GAUFRES 5,50€ (Nutella, Spéculoos, Oreo, Bueno) ; suppléments fraise /
coulis / boule de glace 0,50€. Coulures de chocolat et caramel en transition.` },
  { key: '09-10', files: 'src/scenes/09-drinks.js (45.5→51 s) et src/scenes/10-end.js (51→57 s)', spec: `
BOISSONS : MOJITOS 5,00€ : les 5 mojitos (photos) avec glaçons qui tombent, bulles, nom de parfum en couleur (Fraise,
Violette, Original, Pastèque, Bubble gum) ; CANETTES 2,00€ : Coca-Cola cherry, Oasis tropical, Lipton pêche qui
tournent, « pschitt » ; SAUCES 0,80€ : les 10 pots avec leurs noms exacts (Brazil, Toscane, Cocktail, Mayonnaise, Ketchup,
Tartare, Algérienne, Andalouse, Samouraï, Américaine) en grille ou carrousel rapide.
FIN : LIVRAISON PARTOUT (brush énorme + camion stylisé qui file, lignes de vitesse), « On te livre directement chez toi ! »,
un téléphone (world.phones[0], app à créer dans ta scène : conversation où se tape « ta commande détaillée + ton adresse
complète » — sans vraie adresse) ; puis carte OUVERT 12h – 22h TOUS LES JOURS (comme la capture 8) ; logo O'BINKS +
TASTE THE DIFFERENCE en final net qui tient ~1.5 s ; les 0.4 dernières secondes : tout se replie en seedPoint (dernière
image = première image du film).` },
]

phase('Build')
const built = await pipeline(BUILD, (b) =>
  agent(`${COMMON}\n\n${FOUND_INFO}\n\nMISSION : écrire ${b.files} (remplace les stubs/vitrines). Storyboard (améliore-le si tu trouves mieux,
en gardant les temps, l'ordre et tous les textes/prix) :${b.spec}
Vérifie les deux formats et les deux frontières de ton tronçon. Le rendu doit donner faim et être lisible sur un téléphone.`,
    { label: `build:${b.key}`, phase: 'Build', schema: REPORT }))
log(`Scènes : ${built.filter(Boolean).length}/5`)

// ------------------------------------------------------------------ REVUES (multi-tours) + SON
const REVIEWS = [
  { key: 'R1', range: '0 → 24.5 s (fichiers 01-intro, 02-crousty, 03-tacos, 04-burgers)' },
  { key: 'R2', range: '24.5 → 57 s (fichiers 05-kapsalone, 06-hotdog, 07-texmex, 08-desserts, 09-drinks, 10-end)' },
]
const SOUND = `${COMMON}

MISSION : SOUND DESIGN. Améliore scripts/sound_design.py (appelé par scripts/render.mjs : --out <wav> --duration 57
--cues out/cues.json ; lit les cues dynamiquement). Ajoute les types sizzle (friture), crunch (croquant), splash
(éclaboussure), pour (versement liquide), fizz (canette/glaçons/bulles) en plus des existants ; musique rythmée « street /
trap premium » à 120 BPM (808, kick, claps, hi-hats roulés, stabs) qui suit la structure (intro impact, montées sur les
produits, breaks courts, final), extinction à la fin pour la boucle. Pas de saturation (crête ≤ -1 dBFS). Pour obtenir les
cues : cd ${ROOT} && node scripts/render.mjs --cues-only --width 480 --height 270. Teste numériquement (durée 57 s, crête,
RMS, énergie aux instants des cues, pas de NaN). Écris out/cue-sheet.md. Périmètre : scripts/sound_design.py.`

phase('Review')
const reviewed = await pipeline([...REVIEWS, { key: 'SOUND' }], (r) => {
  if (r.key === 'SOUND') return agent(SOUND, { label: 'sound', phase: 'Sound', schema: REPORT })
  return agent(`${COMMON}

MISSION : DIRECTEUR ARTISTIQUE ADVERSARIAL du tronçon ${r.range}. Rapports de construction : ${JSON.stringify(built)}.
Fais PLUSIEURS TOURS (au moins 3) : planches dans les deux formats (toutes les ~0.3 s + de part et d'autre de chaque
frontière) → liste des défauts → corrections → nouvelle vérification, jusqu'à ce que plus rien ne puisse être amélioré.
Critères : appétissant (pas plastique), prix et textes EXACTS (compare à FACTS.md mot à mot), lisibilité sur téléphone
(9:16 : rien dans les 250 px du haut / 450 px du bas), palette O'BINKS respectée, vues éclatées réussies (pas
d'interpénétration, étiquettes lisibles), transitions variées et sans saut, rythme sur les temps (0.5 s), 4 niveaux de
mouvement, aucune image vide/cramée, pas d'erreur JS, cues présentes. Périmètre : les fichiers de scène de ton tronçon
(+ src/world/food.js et src/core/obinks.js pour des corrections ciblées si un défaut vient de là — dans ce cas vérifie
aussi l'autre tronçon n'est pas cassé).`, { label: `review:${r.key}`, phase: 'Review', schema: REPORT })
})

// ------------------------------------------------------------------ CONTRÔLE QUALITÉ INDÉPENDANT
phase('QA')
const qa = await agent(`${COMMON}

MISSION : CONTRÔLE QUALITÉ INDÉPENDANT FINAL (tu n'as rien construit). 1) Audit texte/prix : extrais toutes les chaînes
affichées des scènes (grep) et compare-les mot à mot à FACTS.md ; rends des stills tous les 0.5 s sur 0→57 s dans les
deux formats (petites tailles, planches) et vérifie visuellement prix et orthographe (accents : CRÈME, FROMAGÈRE, MARINÉ,
PASTÈQUE, SAMOURAÏ, ALGÉRIENNE, CHÈVRE…). 2) Zones sûres 9:16 et marges 16:9. 3) Raccords et boucle (56.983 ≈ 0.0).
4) Erreurs JS. 5) Coût de rendu : mesure s/image en 960×540 sur 5 instants. Corrige directement les défauts trouvés
(corrections minimales), re-vérifie, puis écris out/QA.md (liste des contrôles, résultats, corrections). Rapports
précédents : ${JSON.stringify(reviewed)}`, { label: 'qa', phase: 'QA', schema: REPORT })

return { found, built, reviewed, qa }

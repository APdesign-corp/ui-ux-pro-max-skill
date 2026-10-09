# GSM Center Liège — publicité motion design (20 s, 4K)

Publicité « tech premium » pour **GSM Center Liège**, construite uniquement à partir des deux maquettes
du site fournies par le client (`source/`). Les informations extraites et leur emplacement dans la
source sont listés dans [`source/FACTS.md`](source/FACTS.md). **Aucune donnée commerciale n'a été
inventée.**

- **Format :** 3840 × 2160 (4K UHD), 16:9, 30 i/s (24 i/s possible), 20 s. Une déclinaison verticale
  9:16 (2160 × 3840) est intégrée.
- **Technologie :** Three.js (3D PBR, environnement HDR), tracés SVG réels (`assets/svg/`), Canvas 2D
  (typographie, particules, HUD) et post-production GLSL. Le rendu se fait image par image dans
  Chromium headless, puis ffmpeg encode en H.264 ou ProRes. Le sound design est synthétisé en Python.
- **Déterminisme :** chaque image est une fonction pure du temps. Le rendu est donc reproductible,
  parallélisable, peut reprendre après une coupure, et la timeline se parcourt librement.

## Storyboard

| Temps | Scène | Ce qu'on voit | VFX / caméra | Son |
|---|---|---|---|---|
| 0–3 s | **Intro** | Noir total. Des particules vertes apparaissent puis se posent sur des tracés SVG (anneaux HUD, pistes de circuit, silhouette de téléphone). Le tout converge, le téléphone se transforme en pastille logo « G », impact lumineux, puis **GSM CENTER** se construit à la lumière : particules, puis contour, puis remplissage lettre par lettre. | draw-on SVG, morphing, traînées lumineuses, onde de choc avec distorsion, flare anamorphique, aberration chromatique, push-in avec flou de mouvement, glitch léger | drone, clics, aspiration, **impact**, whoosh |
| 3–6 s | **Smartphones** | Arrivée en whip pan. Trois smartphones 3D (cadre métal, verre, module photo, gravure « GSM CENTER ») tournent en orbite. Typo géante en contour à l'arrière-plan. **SMARTPHONES**, puis la pastille de verre **NEUFS & RECONDITIONNÉS**. | reflets HDR balayés, rim light verte, HUD SVG, lignes de flux, rack focus (profondeur de champ), push-in vers l'écran | bass hit, verre, swish, riser |
| 6–9 s | **Réparation** | Téléphone à l'écran fissuré, vue éclatée (écran, dalle, batterie, carte mère, connecteur, dos) avec étiquettes **ÉCRAN / BATTERIE / CONNECTEUR**. Réassemblage avec impact, scanner vert, puis mini-animation SVG : les fissures se résorbent et une coche de validation apparaît. **RÉPARATION & LIVRAISON**, « DIAGNOSTIC RAPIDE ». | explosion 3D, étincelles, glitch, scanner 3D additif, équerres HUD, distorsion | burst, blips, servo, **snap**, scan, validation |
| 9–12 s | **Accessoires** | Travelling latéral. Écouteurs, coque, chargeur avec câble, casque et globe holographique apparaissent autour du téléphone, reliés par des trajectoires lumineuses. L'icône wifi du site flotte en hologramme. **ACCESSOIRES • MULTIMÉDIA • INTERNET**, un mot par temps. | apparitions studio, socles holographiques, ondes wifi, parallaxe | 3 bass hits sur le tempo, pops, flux de données |
| 12–15 s | **Western Union / Ria** | Carte du monde en points (Natural Earth) révélée depuis Liège. Des arcs lumineux partent de Liège vers le monde entier. **WESTERN UNION \| RIA**, avec la légende « ENVOYEZ ET RECEVEZ DE L'ARGENT ». | révélation radiale (shader), arcs 3D, ondes d'arrivée, plongée caméra dans Liège | pulsation, zips, 2 hits, riser |
| 15–20 s | **Final** | Retour au noir. Le téléphone, les accessoires et les 6 icônes du site convergent en vortex, implosion, impact. Formation de **GSM CENTER LIÈGE**, du slogan « Ton téléphone, *notre spécialité.* », de l'adresse **Rue St Léonard 203 — 4000 Liège**, du numéro **0484 65 60 61** dans une pastille de verre, et de **OUVERT 7J/7**. Impact vert final, puis 1,1 s d'image propre. | vortex de particules, onde de choc, flash cinématique, balayage lumineux, bloom | aspiration, **impact**, nappe, impact « bright » final |

## Voix off — le montage est construit autour d'elle

Priorité de montage : **voix → image → VFX → sound design → musique**.

1. **Script** (`voice/script.json`) : le texte exact du client, avec la direction d'acteur. Elle
   précise les pauses (« À Liège, … »), la courbe d'énergie (calme → dynamique → signature), le débit
   de chaque phrase et la graphie phonétique des noms de marque : « GSM Cènnteur » et « Ouesteurn
   Iounionne ». Ces graphies sont vérifiées par transcription automatique.
2. **Synthèse** (`scripts/voice_tts.py`) : voix neuronale hors ligne (sherpa-onnx : Piper/VITS ou
   Kokoro). Chaque phrase est générée d'un seul tenant pour garder une intonation naturelle, en
   **plusieurs prises**, et la meilleure est retenue par deux juges automatiques (Parakeet TDT 0.6B v3
   et Whisper). Les pauses de la direction d'acteur sont insérées dans les creux naturels de la phrase.
3. **Alignement** : Parakeet donne l'instant exact de **chaque mot** (`voice/vo_layout.json`).
4. **Montage** (`scripts/build_timeline.py` → `src/timeline.json`) : chaque scène est recalée par
   ancres sur les mots. L'explosion du téléphone suit « réparation », le scan vert suit
   « expertise ». « WESTERN UNION » et « RIA » s'affichent au moment exact où ils sont prononcés.
   Chaque produit apparaît sur son mot, et le grand impact tombe sur « GSM Center Liège ». Les cues
   sonores sont générés depuis les mêmes instants.
5. **Mixage** (`scripts/sound_design.py`) :
   - chaîne voix studio : passe-haut, EQ (chaleur 140 Hz, médiums allégés, présence 3,4 kHz, air),
     de-esser, compression 3:1, saturation douce, réverbération courte de petite pièce ;
   - ducking automatique : musique −6 dB et effets −3 dB sous la voix ;
   - musique : pulsation 120 BPM qui monte, silence avant le reveal, puis nappe Fa → Sol → résolution
     La mineur sur la signature ;
   - normalisation à −14 LUFS / −1,5 dBTP à l'encodage. Les pistes séparées (`out/stems/`) et la cue
     sheet (`out/cue-sheet.md`) sont fournies.

```bash
pip install sherpa-onnx numpy espeakng-loader phonemizer-fork
# modèles : https://github.com/k2-fsa/sherpa-onnx/releases (tts-models / asr-models)
python3 scripts/voice_tts.py --voice <voix> --models <dossier modèles> \
  --aligner <...>/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 --judge-whisper <...>/sherpa-onnx-whisper-small \
  --takes 6 --out voice/build && cp voice/build/vo_layout.json voice/build/vo_dry.wav voice/
python3 scripts/build_timeline.py      # remonte l'image autour de la voix
npm run render                         # rendu 4K + mix final
```

Pour remplacer la voix IA par un comédien, enregistrez le même script, déposez le fichier dans
`voice/vo_dry.wav` et produisez `vo_layout.json` avec l'aligneur (`voice_tts.py` contient
`recognize()` et `align()`). Lancez ensuite `build_timeline.py` : tout le montage se recale.

### Casting de la voix

Dix voix neuronales françaises disponibles hors ligne ont été comparées. Pour chacune : débit calibré,
6 à 18 prises par phrase, intelligibilité mesurée par deux transcriptions automatiques (Parakeet TDT
0.6B v3 et Whisper small), registre (F0) et bande passante.

| Voix | Genre (F0 médiane) | Erreurs Parakeet | Erreurs Whisper | Bande |
|---|---|---|---|---|
| **Piper tjiho model 3 (retenue)** | homme, ~139 Hz | **0 %** | 7,6 % | 44,1 kHz |
| Piper tom medium (même voix, entraînement plus court) | homme, 137 Hz | 0 % | 16,7 % | 44,1 kHz |
| Piper upmc « pierre » | homme, 133 Hz | 0 % | 19,5 % | 22 kHz |
| Piper miro high | homme, 109 Hz | 4,2 % | 29,5 % | 22 kHz |
| Kokoro ff_siwis (alternative féminine) | femme, 211 Hz | 3,1 % | 11,4 % | 24 kHz |
| Piper gilles, Coqui css10, Piper siwis | — | 8 à 21 % | 30 à 47 % | 16 à 22 kHz |

La voix retenue suit naturellement la courbe demandée : F0 de 130 Hz, posée, au début ; 147 Hz,
plus énergique, sur les transferts ; 129 Hz, assurée, sur la signature. Les erreurs résiduelles de
Whisper-small portent sur l'accent de « Liège » et sur « accessoires » au singulier : ce sont des
faiblesses de ce petit modèle, Parakeet ne relève aucune erreur.

**Licence de la voix tjiho/tom** : les poids sont sous AGPL-3.0 et la voix est celle d'une personne
réelle. Son usage est autorisé gratuitement à deux conditions : (1) ne pas présenter la voix comme
celle d'une personne réelle ou identifiée, ni citer son auteur dans le service ; (2) publier sous
AGPL-3.0 tout modèle de voix entraîné à partir des poids ou de l'audio généré. L'utilisation de
l'audio dans une publicité respecte ces conditions. Voir https://github.com/tjiho/French-tts-model-piper.
Pour une diffusion TV nationale, une voix de comédien professionnel enregistrée sur le même script
reste l'option la plus sûre. Le pipeline la recale automatiquement.

## Direction artistique

- **Couleurs (celles du site) :** fond `#040605`, vert néon `#39ff14` (signature), dégradé logo
  `#4dff4d → #14e0a0`, blanc `#f4f8f4`, gris métal.
- **Typographie :** Space Grotesk (fichiers locaux `@fontsource`). Grands caractères blancs, mots-clés
  en vert, tracking travaillé, animations lettre par lettre.
- **Lisibilité :** la typo est composée dans un calque séparé, ajouté **après** le bloom. Le texte reste
  donc net quels que soient les effets. Un voile sombre protège le titre au-dessus de la carte.
- **SVG :** symbole d'intro, pastille logo, anneaux HUD, animation de réparation, et les icônes
  **reprises telles quelles du site** (téléphone, clé, wifi, casque, avion en papier, globe). Ils sont
  utilisés pour le tracé progressif, le morphing et la formation de particules.

## Lancer le projet

```bash
cd projects/gsm-center-liege-ad
npm install

npm run preview            # http://localhost:5173 — lecture temps réel + timeline (espace, ←/→)
                           # options d'URL : ?format=9x16  ?t=12.5  ?vfx=0.7  ?w=3840&h=2160

npm run render             # 4K 16:9 30 i/s + son  → out/gsm-center-liege-16x9-3840x2160-30fps.mp4
npm run render:vertical    # 9:16 2160×3840        → Reels / TikTok / Stories
npm run render:preview     # 1280×720 rapide
node scripts/render.mjs --fps 24 --prores        # master ProRes 422 HQ 10 bits + PCM 24 bits
node scripts/render.mjs --still 2.6,8.6,19.95    # images fixes
npm run audio              # régénère la bande-son + out/cue-sheet.md
```

Prérequis : Node 18+, Python 3 avec numpy, ffmpeg et Chromium. Le rendu fonctionne aussi sans GPU
(SwiftShader). Comptez environ 10 s par image en 4K sur 4 cœurs sans GPU, beaucoup moins avec un GPU.
`--workers N` parallélise le rendu, et un rendu interrompu reprend là où il s'est arrêté.

## Tout est paramétrable

| Quoi | Où |
|---|---|
| Textes, adresse, téléphone, slogan, avis (désactivé) | `src/config.js` → `brand`, `texts` |
| Couleurs | `src/config.js` → `colors` |
| Résolution, FPS, format 16:9 / 9:16 | `src/config.js` → `video`, ou options `--width --height --fps --format` |
| Vitesse globale | `src/config.js` → `timing.speed` (ou `?speed=1.1`) |
| Intensité des VFX, particules, bloom, grain, scanlines, glitch, flares, DOF, flou de mouvement | `src/config.js` → `vfx` (ou `?vfx=0.7`) |
| Début et fin de chaque scène, cues sonores, BPM | `src/timeline.json` (l'image **et** le son suivent) |
| Tracés vectoriels | `assets/svg/*.svg` |

## Arborescence

```
src/
  config.js            variables (couleurs, textes, VFX, résolution…)
  timeline.json        scènes + cues sonores (source unique image/son)
  main.js              orchestrateur, renderFrame(t)
  core/                anim (easings, rng), svg (parse/mesure/morph), draw (typo, VFX 2D)
  engine/              renderer (Three + calques 2D + post), shaders GLSL
  world/               studio HDR, smartphone 3D, accessoires, carte du monde, textures
  scenes/              01-intro … 06-final (une timeline par scène)
assets/svg/            SVG animables (dont les icônes du site)
scripts/               render.mjs (export), serve.mjs, sound_design.py
source/                maquettes du site fournies + FACTS.md
```

## Notes

- **Western Union et Ria** sont composés en typographie. Leurs logos officiels sont des marques
  déposées : pour une diffusion, obtenez-les via le kit partenaire de l'agent et placez-les dans la
  scène 5.
- **Son :** la piste générée est une maquette sonore fidèle à la cue sheet (`out/cue-sheet.md`) :
  chaque apparition a son hit, whoosh, riser ou impact. Elle est normalisée à -14 LUFS (réseaux
  sociaux). Pour la TV belge, visez -23 LUFS (EBU R128) via l'option `loudnorm` de `render.mjs`.
- **Déclinaisons :** le format 9:16 recompose automatiquement typographie, caméras et carte. Pour un
  écran publicitaire sans son, la pub reste lisible sans audio.

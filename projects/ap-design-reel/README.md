# AP Design — Reel Instagram / TikTok « TU SCROLLES. TU VOIS. TU RESTES. »

Reel promotionnel vertical pour **AP Design** (motion design • 3D • VFX).

- **Format :** 9:16, 2160 × 3840 (4K), 30 i/s, ~15,7 s. Mobile-first, avec des safe zones IG/TikTok :
  aucun texte important dans les 14 % du haut, sous 72 % de la hauteur, ni contre le bord droit.
  La typo est décalée vers la gauche (`layout()` dans `src/scenes/kit.js`).
- **Boucle parfaite :** la vidéo finit en retour au noir, et la 1re image est noire avec l'impact
  d'ouverture.
- **Charte :** aucun fichier de marque n'a été fourni. La direction suit donc le fallback premium : noir
  profond, blanc, métal chromé et un accent lumineux violet électrique (`colors.neon`, modifiable).
  Le monogramme AP est dessiné en géométrie (`src/world/objects.js`), en 3D extrudé chromé et en 2D.
- **Technologie :** Three.js (PBR, chrome, verre, profondeur de champ), Canvas 2D (typographie
  cinétique, particules, UI), post-production GLSL (bloom, aberration chromatique, flous de mouvement,
  onde de choc, glitch, grain). Rendu image par image dans Chromium headless, puis encodage ffmpeg.

## Storyboard (calé sur la voix off, mot par mot)

| Temps | Scène | Voix off | Image / VFX | Son |
|---|---|---|---|---|
| 0–1,7 s | **01 HOOK** | « Tu veux vraiment qu'on remarque tes vidéos ? » | Impact dès la 3e image : flash, glitch, une sculpture chromée fonce vers la caméra, puis onde de choc et gerbe d'étincelles. **TU VEUX DES VIDÉOS / COMME ÇA ?** en slam. Rush caméra dans l'objet. | impact, burst, whoosh, hit, riser, aspiration |
| 1,7–3,3 s | **02 SHOWREEL** | « Alors arrête le contenu banal. » | 5 plans de ~0,3 s : smartphone en orbite avec HUD, macro chrome avec balayage lumineux, hologramme filaire, produits, orbe de verre et anneaux. Chaque coupe = flash + whip blur. Glitch sur « banal ». | un son par coupe (hit / swish / digital / whoosh / click), snap |
| 3,3–4,3 s | **03 HERO SHOT** | « Motion design. » | **MOTION** derrière la sculpture et **DESIGN** devant, en couleur accent : la typo est intégrée dans la profondeur 3D. Travelling lent, profondeur de champ. | impact doux, shimmer, verre |
| 4,3–8,5 s | **04 3D / VFX / SCROLL** | « 3D. VFX. On transforme tes idées en images qui arrêtent le scroll. » | **3D** : le filaire se matérialise en chrome. **VFX** : orbe qui explose en lumière. Puis un flux de posts « banals » défile de plus en plus vite (flou vertical) jusqu'à un **ARRÊT BRUTAL sur « arrêtent »** (flash, secousse, glitch), puis **SCROLL** énorme. | hit, burst, zips + riser, **snap + impact** sur l'arrêt, hit |
| 8,5–10,1 s | **05 REVEAL** | « Ça, c'est AP Design. » | Noir et silence, un point de lumière qui respire. **FLASH sur « AP »** : le monogramme AP chromé 3D apparaît et la caméra recule pour révéler les anneaux, faisceaux, éclats, particules et la grille. **DESIGN**, puis la signature **TON PROJET. NOTRE CRÉATIVITÉ.** | silence, riser, **impact + sub-drop**, shimmer, verre |
| 10,1–15,7 s | **06 CTA / LOOP** | « Tu veux la prochaine ? Suis le compte. Et pour collaborer… DM. » | Logo, profil **+ SUIVRE** (sur « Suis »). Le bouton glass **DM POUR COLLABORER** apparaît **exactement sur « DM »** (impact, tap, halo pulsé), puis arrive la notification « Nouveau message ». **MOTION DESIGN • 3D • VFX**. Retour au noir pour la boucle. | pop, blip, ticks, **impact bright + click** sur « DM », success, aspiration |

## Voix off

La voix est masculine, en français. Pour la rendre moins robotique et plus assurée, elle passe sur
**Supertonic 3** (voix 7), un modèle plus expressif que Piper : F0 ≈ 115 Hz, ~10 demi-tons d'amplitude.

1. `voice/script.json` contient le texte exact, les respirations et les accents :
   - accents sur « banal », « arrêtent », « scroll », « AP » et « DM » ;
   - graphies alternatives pour les sigles (3D, VFX, AP, DM).
2. `scripts/voice_tts.py` génère 6 prises par phrase. Les deux juges ASR (Parakeet et Whisper)
   retiennent la meilleure, puis Parakeet aligne chaque mot dans `voice/vo_layout.json`.
3. `scripts/voice_relayout.py` repose les respirations sans régénérer la voix. Exemple : un silence
   de 0,9 s avant « Ça, c'est AP Design. » pour le noir du reveal.
4. `scripts/build_timeline.py` écrit `src/timeline.json` : bornes des scènes, marqueurs de mots, cues
   sonores et structure de la musique.
5. `scripts/sound_design.py` produit le mix. Il comprend :
   - une musique électro cinématique, basse lourde, calée sur le tempo (120 BPM) ;
   - un silence avant le reveal, une nappe puis une résolution sur « DM » ;
   - les SFX ;
   - la VO traitée (EQ, de-esser, compression, reverb courte) ;
   - un ducking de −6 dB sur la musique et de −3 dB sur les SFX ;
   - un loudness de −14 LUFS.

```bash
python3 scripts/voice_relayout.py     # (optionnel) après modification des gaps dans script.json
python3 scripts/build_timeline.py
python3 scripts/sound_design.py       # -> out/ap-design-reel-sound.wav + stems + cue-sheet
```

## Variables (`src/config.js`)

| Variable | Rôle |
|---|---|
| `brand.name / mono / word / tagline / handle / services` | logo (monogramme + mot), signature, profil, services |
| `colors.*` | noir, blanc, métal, accent (`neon`, `neon2`), accent froid (`teal`) |
| `texts.*` | tous les textes à l'écran (hook, MOTION DESIGN, 3D/VFX, SCROLL, + SUIVRE, CTA DM, notification) |
| `timing.speed` | vitesse globale (la durée suit la voix off : `--hold` dans `build_timeline.py`) |
| `vfx.intensity / particles / bloom / glitch / flares / motionBlur / dof` | intensité VFX, densité de particules, etc. |
| `video.width / height / fps` | résolution (2160 × 3840 par défaut) et cadence |
| musique / VO | `--bpm` dans `build_timeline.py` ; voix, prises et vitesse dans `voice_tts.py` |

Surcharges par URL : `?vfx=1.3&particles=0.6&fps=24`.

## Rendu

```bash
npm install
node scripts/render.mjs --width 1080 --height 1920 --workers 3 --out out/ap-design-reel-1080x1920.mp4
node scripts/render.mjs --workers 3 --out out/ap-design-reel-4k.mp4     # 2160 × 3840
node scripts/render.mjs --width 540 --height 960 --still 1.6,4.5,7.4,10,14.6
```

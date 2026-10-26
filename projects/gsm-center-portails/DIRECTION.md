# GSM Center Liège — « Portails » : bible de réalisation

Publicité de lancement 30 s, 60 i/s, pour **GSM Center Liège**, magasin de téléphonie mobile
(Rue St Léonard 203, 4000 Liège). Deux formats issus du MÊME projet : **16:9** (télés du magasin)
et **9:16** (TikTok / Reels / Shorts, composition recomposée, pas un recadrage).

Niveau attendu : **lancement Apple × clip × film d'action**. Le client a trouvé sa première version
« plate, sage, diaporama ». Le spectateur ne doit jamais décrocher. **À chaque seconde, au moins
4 niveaux de mouvement simultanés** (caméra, objets 3D, texte, particules/fond/lumière).

Toute la vidéo est **un seul plan-séquence virtuel** : jamais de coupe sèche. Chaque changement
se fait par un mouvement de caméra ou une **traversée** : la caméra entre DANS un téléphone (zoom
accéléré vers l'écran, l'écran déborde et envahit tout le cadre, flash) et ressort dans un autre
monde. **Aucune transition ne ressemble à une autre.**

---

## 0. HISTOIRE — PRIORITAIRE sur tout storyboard reçu dans un prompt (ajout du client)

Vidéo moderne, soignée, percutante, avec **un exemple d'utilisateur qui vit un parcours complet
dans les écrans des téléphones**, étape par étape, dans cet ordre, sans jamais perdre le rythme.
**Chaque étape de l'histoire est un écran de téléphone dans lequel la caméra plonge.** Contenu
générique : uniquement les services confirmés (FACTS.md) ou des libellés neutres, aucune statistique.

| Étape | Où (segment) | Ce qu'on voit (apps de `world/screens.js`) |
|---|---|---|
| 1. Le client a un besoin (nouveau téléphone, réparation, accessoire) et le CHERCHE | **orbit** (fin) → **roll** | app **`find`** : `P.queries = ['nouveau smartphone', 'réparation écran', 'coque']` tapées puis effacées, puis `P.text = 'GSM Liège'` ; la barre de recherche se tape lettre par lettre (en GROS aussi sur `f.ui` avec `typewriter` pour la lisibilité : « nouveau smartphone… réparation écran… »). Au moins un écran d'orbit montre déjà `find`. |
| 2. Il TROUVE la page de GSM Center Liège (le nom apparaît en GROS) | **roll** (7.0 → 8.0) → **interface** | `find` avec `P.resultsAt` : le 1er résultat est la carte « GSM CENTER Liège » ; `P.touch` tape la carte (point `FIND_HIT` exporté par screens.js) ; TRAVERSÉE 1 dans cet écran → on ressort DANS la page : **interface** démarre avec « GSM CENTER » géant (GSM blanc / CENTER vert) + « LIÈGE », comme l'en-tête de l'app **`store`**. |
| 3. Il DÉCOUVRE les services : cartes qui glissent, pastilles qui apparaissent | **interface** (le tunnel = la page du magasin, ses cartes sont les services) puis **circuits / glass** (service RÉPARATION vécu de l'intérieur) puis **gear** (service ACCESSOIRES) | cartes du tunnel = services confirmés : Smartphones (Neufs & reconditionnés), Réparation (Écran, batterie, connecteur), Accessoires (Coques, chargeurs, écouteurs), Multimédia & Internet ; pastilles en cascade (Neufs, Reconditionnés, Réparation rapide, Livraison) ; apps `store`, `list`, `pills`, `repair`. Le plan sur l'épaule (téléphone-vaisseau) affiche l'app `store` avec la carte « Réparation » qui s'illumine juste avant la plongée dans la carte mère (on entre dans le service Réparation). |
| 4. Il APPELLE ou demande l'ITINÉRAIRE : cercle de toucher avec onde sur un bouton, puis une ligne lumineuse trace le chemin jusqu'à la boutique | **gear** (fin, 20.8 → 22.0) | le téléphone posé au sol affiche d'abord `store` (`P.scroll` 0→1 jusqu'aux boutons) ou `map` avec `P.buttons` : boutons « Appeler » / « Itinéraire » ; `P.touch` tape « Itinéraire » (`STORE_BTN.route` ou `MAP_BTN.route`) ; puis app **`map`** avec `P.route` 0→1 : la LIGNE LUMINEUSE trace le chemin jusqu'au repère du magasin (`MAP_PIN`) ; la chute libre (traversée 4) plonge dans cette carte. |
| 5. Il ARRIVE au magasin, Rue St Léonard 203, 4000 Liège | **city** | on ressort au-dessus de la ville de nuit : la MÊME ligne lumineuse continue en 3D dans les rues (ruban/tube vert néon qui avance) jusqu'au repère du magasin ; adresse affichée dans la ville. |
| 6. Final : adresse + appel à l'action | **final** | comme décrit au §5 (GSM CENTER, Rue St Léonard 203 — 4000 Liège, « PASSE EN BOUTIQUE »). |

Les agents de revue (directeurs artistiques) **vérifient que cette histoire est lisible et
l'implémentent si un segment ne la respecte pas encore** (en gardant les mouvements de caméra,
traversées et temps de raccord). Un spectateur qui regarde sans le son doit comprendre :
« je cherche → je trouve GSM Center Liège → je vois ses services → je lance l'itinéraire → j'arrive
Rue St Léonard 203 ».

## 1. Palette : EXACTEMENT celle de la première vidéo GSM Center (exigence du client)

| Rôle | Couleur |
|---|---|
| Fond (noir profond) | `#040605` (dégradés vers le vert nuit `#06140b`) |
| Accent principal (signature) | vert néon `#39ff14` |
| Dégradé du logo | `#4dff4d → #14e0a0` (le teal `#14e0a0` sert d'accent secondaire) |
| Texte | blanc `#f4f8f4` |
| Texte secondaire | gris `#93a095` |
| Métal | `#b2b8be` / `#5f666c` |
| Encre sur vert | `#021a0c` |

**Interdit** : bleu, violet, rouge, rose, orange, jaune. Le brief d'origine parlait de « bleu
électrique + accent chaud » : le client l'a remplacé par SA palette. Le vert néon remplace le bleu
électrique, le teal remplace l'accent chaud. Le blanc pur et le noir profond restent.
Constantes disponibles : `import { C } from '../core/type.js'` (`C.neon`, `C.teal`, `C.white`, …).

## 2. Typographie

- **Poppins** (géométrique) pour les titres : très gros, **800/900 gras** contrastés avec **200/300
  fin**. Jamais de petit texte mou. `setFont(g, size, weight, tracking)` de `core/draw.js` utilise
  Poppins par défaut.
- **Space Grotesk** (police du site du client) pour les interfaces dans les écrans et le HUD :
  `g.font = '600 32px "Space Grotesk"'`.
- « GSM CENTER » : **GSM en blanc, CENTER en vert néon** (`brandColorAt` dans `core/type.js`).
- **16:9 (télé)** : tout est lisible de loin, compréhensible SANS SON, dans la zone sûre de 5 % sur
  chaque bord.
- **9:16** : textes PLUS GROS, découpés sur plusieurs lignes (`wrapLines`), dans la zone centrale.
  **Rien d'important dans les 250 px du haut ni les 450 px du bas** (sur 1920 px de haut, à
  l'échelle). `f.L.safe = { l, r, t, b, w, h, cx, cy }` donne la zone sûre du format courant.
- Le texte se dessine sur le calque `f.ui` (net, ajouté APRÈS le bloom). Les lumières, particules,
  traînées et éclairs se dessinent sur `f.fx` (additif, AVANT le bloom, ils brillent).

## 3. Contenu et honnêteté

Textes en français, courts et puissants. **Source unique : `FACTS.md`** (site du client) ou des
formules génériques. **N'invente AUCUN** prix, promotion, numéro, horaire, avis, statistique ou
marque partenaire. Les compteurs animés restent **non factuels** (réparation qui monte à 100 %,
chargement…). Pas de logo Apple ni de marque protégée : téléphones génériques « style iPhone ».
Aucun nom, visage ni contenu des images de référence du client.

Textes autorisés (voir `src/config.js`) : « GSM CENTER », « LIÈGE », « Les derniers smartphones. »,
« SMARTPHONES », « Neufs & reconditionnés », « Choisis ton smartphone », « RÉPARATION »,
« Réparation rapide », « ÉCRAN / BATTERIE / CONNECTEUR », « DIAGNOSTIC RAPIDE », « COQUES /
CHARGEURS / ÉCOUTEURS », « Accessoires & multimédia », « Tout pour ton mobile, au même endroit. »,
« Ton téléphone, notre spécialité. », « Rue St Léonard 203 », « 4000 Liège », « PASSE EN BOUTIQUE »,
« 01 — CHOISIR », « 02 — RÉPARER », « 03 — S'ÉQUIPER ».

## 4. Effets à reprendre des images de référence (poussés beaucoup plus loin)

Téléphone 3D penché en forte perspective qui pivote en continu (jamais droit plus d'un instant) ·
texte qui se tape lettre par lettre avec curseur, dernier mot surligné en vert néon (`typewriter`) ·
listes et éléments d'interface qui glissent un par un avec décalage (apps `list`, `search`) ·
cartes et pages très inclinées qui entrent de côté en tournant puis se redressent pendant que la
caméra zoome · compteurs qui défilent (app `counter`, `repair`) · boutons arrondis, pastilles rondes
en cascade (app `pills`, `home`) · cercle de toucher avec onde (`touchRipple`, `P.touch`) · flou de
mouvement très fort sur tout mouvement rapide · interface sombre et propre, vert néon, blanc pur,
texte gras.

---

## 5. Architecture technique (NE PAS MODIFIER les fichiers partagés)

```
src/main.js            orchestrateur : caméra unique, flou de mouvement auto, effets globaux par cues
src/timeline.json      segments (début/fin en secondes)
src/config.js          couleurs, textes, formats, VFX
src/engine/            renderer (Three.js + post-production), shaders
src/core/anim.js       E (easings), seg, win, pulse, rng, noise1, lerp, clamp, speedRamp, catmull, v3lerp, TAU
src/core/draw.js       setFont, textWidth, fitSize, charLayout, drawText, textSweep, strokeTextProgress,
                       radialGlow, flare, streak, sparks, shockRing, flowCurve, glassPill, eyebrow, roundRect
src/core/type.js       C (palette), layout, wrapLines, typewriter, slam, splitLetters, maskReveal,
                       brandColorAt, speedLines, touchRipple, seedPoint
src/world/phone.js     téléphones 3D (titane chanfreiné, verre, 3 objectifs + flash, Dynamic Island, boutons)
src/world/screens.js   écrans vivants : createScreen(), drawScreenApp(g, w, h, app, t, P)
src/world/studio.js    environnement HDR (reflets), fond, sol grille, faisceaux, poussière
src/world/accessories.js  écouteurs, chargeur + câble, coque, casque
src/scenes/NN-id.js    UN fichier par segment (c'est là que vous travaillez)
```

**Fichiers partagés en LECTURE SEULE** : `main.js`, `engine/*`, `core/*`, `world/*`, `config.js`,
`timeline.json`, `index.html`, `scripts/render.mjs`. Plusieurs agents travaillent en même temps :
mettez tout votre code dans votre/vos fichier(s) de segment, et si besoin dans de NOUVEAUX
fichiers préfixés par votre segment (`src/scenes/05-circuits-board.js`…). Si vous trouvez un vrai
bug dans un fichier partagé, contournez-le localement et signalez-le dans votre rapport final.

### Contrat d'un segment

```js
export const cues = [ { t: 0.75, type: 'impact', gain: 1 }, ... ];   // temps LOCAUX (s depuis le début du segment)
export default function create(ctx) {
  // ctx = { cfg, engine, scene, THREE, world, W, H, V (bool vertical), u (unité 1 @1080), L (layout), fps, seg }
  const group = new ctx.THREE.Group();     // tout ce qui appartient au segment (visible seulement pendant le segment)
  return {
    group,
    camera(lt) { return { pos: [x, y, z], target: [x, y, z], roll: rad, fov: degVertical }; }, // PURE !
    update(f) { ... },
  };
}
```

- `camera(lt)` doit être une **fonction pure** du temps local (pas d'état, pas de variable
  modifiée dans `update`) : `main.js` l'appelle aussi à `lt - 1/60` pour calculer le **flou de
  mouvement automatique** (translation, avancée → zoom blur, roulis → roll blur). Corollaire :
  un saut brutal de caméra À L'INTÉRIEUR d'un segment produit un énorme flou ; c'est voulu pour les
  whip pans, à éviter sinon (masquez par un flash si vous devez « couper »).
- `f` (contexte d'image) : `{ t, lt, dur, p, W, H, V, u, L, fps, fx, ui, post, world, camera, cam,
  scene, THREE, project([x,y,z]) → [px, py, ndcZ], cues, shake }`.
- `f.post` (post-production, à moduler) : `ca, blur:[x,y] (uv), zoomBlur, zoomCenter:[u,v],
  rollBlur (rad), rgb (séparation RGB), shock:[cx,cy,rayon,force] (onde de choc distordante, rayon <0 = off),
  glitch (0..1), scan, vignette, flash (0..1+), flashColor:[r,g,b], grain, fade, bloom, bloomRadius,
  fxGain, exposure, dof:{focus, aperture, maxblur} (profondeur de champ), uiBlur (0 = texte net
  pendant les flous), edgeBlur`. Le flou automatique est déjà rempli AVANT `update` : vous pouvez
  l'augmenter (`post.blur[0] += …`), le réduire, ou l'annuler.
- Monde partagé `f.world` (tout est caché au début de chaque image, à vous de l'afficher) :
  - `world.phones[0..5]` : `{ phone, screen, group }`. Variantes : 0 hero (titane clair, AVEC
    composants internes : `phone.setExplode(p, t)` écarte écran/cadre/dos/batterie/carte mère/
    connecteur ; `phone.anchors.board` = carte mère), 1 graphite, 2 vert, 3 hero (sans internes),
    4 graphite, 5 vert. Dimensions : `PHONE = { W: .74, H: 1.56, D: .082 }` (unités monde).
    Écran : `screen.draw(app, tLocalApp, P)` à appeler à chaque image où le téléphone est visible.
    Apps : `off`, `wake` (P.p 0→1), `home`, `search` (P.text, P.cps, P.delay, P.gridAt),
    **`find`** (histoire étapes 1-2 : P.queries, P.text, P.cps, P.delay, P.resultsAt → 1er résultat
    « GSM CENTER Liège », point de toucher `FIND_HIT`), **`store`** (page du magasin, étapes 2-4 :
    P.cardsAt, P.pillsAt, P.buttonsAt, P.scroll 0→1, boutons `STORE_BTN.call/route` valables à
    scroll = 1), `map` (étape 4 : **P.route 0→1** = ligne lumineuse jusqu'au repère `MAP_PIN`,
    tracé `MAP_ROUTE`, **P.buttons** = temps d'apparition du panneau Appeler / Itinéraire,
    `MAP_BTN.route`),
    `list` (P.title), `counter` (P.to, P.suffix, P.label, P.dur), `pills`, `repair` (P.p),
    `portal` (P.p : lumière qui envahit l'écran), `map`. Options : `P.touch = {x, y, t}`
    (onde de toucher), `P.brightness`. `phone.setScreenMap(tex, intensité)` pour l'intensité.
  - `world.studio.update(t, { backdrop, grid, beams, dust, motes, env, envRot, rim, key, glow })`
    (main l'appelle déjà avec des valeurs par défaut, rappelez-le pour changer). `studio.backdrop`,
    `studio.grid`, `studio.rimG`, `studio.sweep` (PointLight balayante) accessibles.
  - `world.acc` : `{ group, earbuds, charger, caseShell, headphones, internet }` (rendre
    `acc.group.visible = true` puis positionner chaque objet ; cacher ceux non utilisés).
- Le ton-mapping et le bloom sont globaux : un écran ou une lumière trop forts « brûlent ».
  Gardez l'image lisible et le fond profond (noir `#040605` avec dégradés verts subtils).

### Cues (bruitages)

`export const cues = [...]` en temps LOCAL du segment. `main.js` les agrège ; les types `impact`,
`boom`, `hit`, `whip`, `glass`, `slam`, `snap` déclenchent aussi une secousse caméra, et
`glitch`, `impact`, `boom` un glitch RGB automatique. Types reconnus par le sound design :
`impact` (gros coup grave), `boom` (sub + impact énorme), `hit` (coup de basse court), `whoosh`
(passage, `dur`), `whip` (whip pan, très court), `riser` (montée de tension, `dur` = durée
jusqu'au pic placé à `t + dur`), `suck` (aspiration inversée avant impact, `dur`), `zap` (éclair
électrique), `glass` (verre qui se brise), `reverse` (son inversé / rembobinage, `dur`),
`click` (déclic d'interface), `type` (frappe de clavier : `dur` et `cps`), `tick` (compteur),
`pop` (pastille), `swish` (élément qui glisse), `data` (flux numérique, `dur`), `scan`, `glitch`,
`success` (validation), `sub` (grave tenu, `dur`), `flash` (scintillement), `drop` (retour du rythme).
Champs optionnels : `gain` (0..1.5), `pan` (-1..1), `dur`, `cps`. Chaque événement visuel fort
DOIT avoir son cue au même instant.

Grille musicale : **120 BPM** (un temps = 0,5 s, une mesure = 2 s). Les frontières de segments
tombent sur des temps. Calez les impacts et les changements de direction sur les temps.

### Raccords aux frontières (contrat entre segments écrits par des agents différents)

| t (s) | De → vers | Raccord exact |
|---|---|---|
| 0.00 | (boucle) | Image 0 = fond noir + `seedPoint(f.fx, W, H, 1)` au centre, rien d'autre. |
| 2.00 | ignite → orbit | Les lettres explosent vers la caméra (zoom blur) et des points lumineux en profondeur deviennent les téléphones. Interne au même agent. |
| 5.00 | orbit → roll | IMPACT (cue `impact` à 5.00, côté roll lt=0) : orbit finit en punch-in avec flash vert-blanc montant à 0.8 ; roll démarre avec flash 0.8 qui décroît en 0.25 s. |
| 8.00 | roll → interface | TRAVERSÉE 1 : l'écran (app `search`, puis `portal`) remplit tout le cadre, flash 1.0 à 8.00 ; interface démarre dans le flash (1.0 → 0 en 0.3 s), lignes de vitesse. Interne au même agent. |
| 11.00 | interface → circuits | TRAVERSÉE 2 : la caméra plonge entre les couches d'un téléphone éclaté jusqu'à ce que la carte mère remplisse le cadre ; flash vert 1.0 à 11.00 (`flashColor ≈ [0.6,1,0.6]`). Circuits démarre dans ce flash (décroît en 0.3 s), caméra en rase-mottes au-dessus du circuit géant. |
| 14.00 | circuits → glass | TRAVERSÉE 3 : interne au même agent (la caméra percute le verre par-dessous). |
| 18.00 | glass → gear | WHIP : glass finit sur un whip pan vers la gauche (flou horizontal énorme, `post.blur[0]` ≥ 0.08 sur les 0.12 dernières secondes, flash 0.5) ; gear démarre dans le même whip (flou qui se résorbe en 0.15 s, flash 0.5 → 0). Cue `whip` à 18.00 côté gear. |
| 22.00 | gear → city | TRAVERSÉE 4 : interne au même agent (chute libre dans un écran posé au sol, plongée verticale). |
| 26.00 | city → final | TRAVERSÉE 5 : un portail (écran géant qui jaillit de la ville) avale la caméra, glitch RGB, flash BLANC 1.0 à 26.00 ; final démarre dans le blanc (1.0 → 0 en 0.45 s), calme dramatique. Cue `boom` à 26.00 côté final. |
| 30.00 | final → (boucle) | La dernière image (t ≈ 29.983) = la première : tout s'est replié dans `seedPoint` au centre, fond noir. |

### Bibliothèque de mouvements de caméra (tous utilisés au moins une fois)

1. Orbite 360° accélération puis ralenti → **orbit**
2. Roll 180°/360° en avançant, redressement sur impact → **roll**
3. Plongée verticale (chute libre jusqu'à un téléphone posé au sol) → **gear** (fin, traversée 4)
4. Contre-plongée : on remonte le long d'un téléphone géant → **glass**
5. Whip pan masquant une transition → **roll** et **glass → gear**
6. Dolly zoom (effet Vertigo) → **circuits**
7. Changement de direction brutal (file à gauche, freine net, repart, tremblement) → **circuits**, **gear**
8. Passage sous / au-dessus / à travers les objets, en frôlant les bords → **orbit**, **gear**
9. Spirale qui se resserre → **city**
10. Plan sur l'épaule : on suit un téléphone qui file comme un vaisseau → **interface**
11. Inclinaison continue qui se redresse quand le contenu apparaît → **roll**, **interface**, **final**

### Vertical (9:16)

Les iPhone sont GRANDS et occupent la hauteur du cadre ; la caméra monte et descend le long des
téléphones (plongées, contre-plongées, chutes verticales très spectaculaires). Mêmes mouvements,
effets, transitions et timing que le 16:9, recomposés : plusieurs téléphones s'empilent en
profondeur/verticalement au lieu de s'étaler en largeur. Utilisez `ctx.V` pour adapter caméra,
fov, positions et typographie (souvent `fov` plus large ou caméra plus reculée en vertical pour
les plans larges).

---

## 6. Vérification OBLIGATOIRE (vous devez regarder vos images)

```bash
cd projects/gsm-center-portails
# 16:9 et 9:16, petites tailles pour aller vite (les temps sont GLOBAUX, en secondes)
node scripts/render.mjs --still 8.2,9.0,10.5 --width 960 --height 540 --stills-dir out/stills/<segment>
node scripts/render.mjs --still 8.2,9.0,10.5 --format 9x16 --width 540 --height 960 --stills-dir out/stills/<segment>
```

Puis ouvrez CHAQUE PNG avec l'outil Read et corrigez tout ce qui est plat, vide, flou par erreur,
mal aligné, illisible, coupé, hors zone sûre, moche, trop sombre ou cramé, ou qui sort de la
palette. Vérifiez au moins 6 instants par seconde-clé de votre segment ET les deux images de part
et d'autre de chaque frontière (ex. 7.98 et 8.02). Vérifiez que la caméra ne traverse pas un objet
par erreur. Si une scène est décevante, refaites-la entièrement. Un rendu de still prend ~20-40 s
(démarrage de Chromium) : regroupez plusieurs instants par commande.

Vous pouvez aussi faire un mini-clip pour juger le mouvement (≈ 1-3 min) :
```bash
node scripts/render.mjs --from 8 --to 11 --fps 30 --width 640 --height 360 --no-audio --out out/clips/<segment>.mp4 --frames-dir out/frames-<segment>
ffmpeg -y -loglevel error -i out/clips/<segment>.mp4 -vf "fps=6,scale=320:-1,tile=6x3" out/clips/<segment>-sheet.png
```
(regardez la planche contact avec Read.)

## 7. Performance (le rendu final fait 1800 images × 2 formats, en 1080p puis en 4K, sur CPU)

- Ne créez JAMAIS de géométrie, matériau, canvas ou texture dans `update` : tout dans `create`.
- > 100 objets identiques → `InstancedMesh` ou `Points`.
- Canvas 2D : pas de `getImageData` par image ; pas de boucles de milliers de dégradés par image.
- Écrans : ne redessinez que les écrans des téléphones visibles.
- Une image en 960×540 ne doit pas dépasser ~1 s de rendu.

## 8. Rapport final de chaque agent

Fichiers créés/modifiés, ce qui a été vérifié (instants regardés, deux formats), problèmes
connus restants, bugs éventuels trouvés dans les fichiers partagés.

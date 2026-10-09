# O'BINKS — « Taste the difference » : bible de réalisation

Publicité motion design **57 s, 60 i/s**, du menu complet du fast-food **O'BINKS**. Deux formats
issus du même code : **9:16** (Instagram / TikTok, format prioritaire du client pour les réseaux)
et **16:9**. Niveau attendu : pub de chaîne de fast-food premium, **appétissante**, rythme nerveux,
facturable 300-500 €. Le client a fourni 9 captures de son menu (`assets/source/menu-1..9.png`) :
on garde **les mêmes couleurs, visuels et textes**.

## 0. Règles d'or
1. **Aucune faute de prix ni de texte** : tout vient de `FACTS.md` (format `10,00€`, virgule).
   Adresse et téléphone RÉELS (fiche Google) : **Rue St Nicolas 460, 4000 Liège** · **0472 65 40 43**.
   Note Google RÉELLE à afficher (demande du client) : **4,8 ★ — 61 avis Google**. Pas d'autre statistique.
2. **Appétissant** : gros plans, vapeur/fumée chaude, fromage qui coule, brillance des sauces,
   miettes, croustillant. Les **photos du menu** (découpées dans `assets/menu/`) sont le visuel
   « beauté » ; la **3D procédurale** (`src/world/food.js`) sert aux **vues éclatées**.
3. **Vue éclatée** (exploded view) pour TOUS les produits composés : les ingrédients se séparent
   en couches qui flottent (légère rotation, ombres, étiquettes d'ingrédients), puis se
   réassemblent avec un impact. Burgers et sandwichs (8 recettes), Kapsalone, Crousty Binks,
   Tacos, Hot dog, Tiramisu (verrine), Milkshakes.
4. **Rythme 120 BPM** (temps = 0,5 s) : chaque changement de produit ou de prix tombe sur un temps.
   Au moins 4 niveaux de mouvement à chaque instant (caméra, produit, typo, particules/fond).
5. **Transitions toutes différentes** et rapides : éclaboussure de peinture rouge, trait de
   pinceau qui balaie, fumée qui envahit, coulure de sauce, néon qui clignote et coupe, zoom à
   travers un produit, whip pan, glitch, flash, lampadaire qui s'allume…
6. **Compréhensible sans le son**, lisible sur téléphone : prix ÉNORMES (jaune ou blanc sur
   étiquette rouge néon), noms de produits en brush/graffiti, listes en linéale condensée.

## 1. Identité (relevée sur les captures)
| Rôle | Valeur |
|---|---|
| Fond | noir profond `#0a0a0b` texturé (briques sombres, asphalte mouillé), fumée |
| Rouge néon | `#ff2a2a` (glow, contours d'étiquettes), rouge peinture `#e3141b`, rouge sombre `#5a0508` |
| Blanc | `#ffffff` (titres) |
| Jaune | `#ffc21a` (prix, accents « SUPPLÉMENT », soulignés) |
| Ambiance | rue de nuit : lampadaires rouges, fumée, éclaboussures de peinture rouge, traits de pinceau, briques, nappe à carreaux rouges (Crousty) |
| Logo | « O' » rouge + « BINKS » blanc, lettrage brush avec contour (voir capture 8) → `world.images.logo` (découpe propre) |
| Polices | `Permanent Marker` (brush/graffiti : noms produits), `Bangers` (titres street), `Anton` / `Bebas Neue` (titres condensés, PRIX), `Oswald` (listes), `Kaushan Script` (accroches manuscrites) |
Constantes : `import { C } from '../core/type.js'` (`C.neon` = rouge néon, `C.yellow` = jaune, `C.red`, `C.white`).

## 2. Structure et temps (s) — `src/timeline.json`
| # | id | début → fin | Contenu exact (FACTS.md) |
|---|---|---|---|
| 1 | intro | 0 → 3.5 | Logo O'BINKS en IMPACT (peinture rouge qui éclabousse, onde, flash), « TASTE THE DIFFERENCE » |
| 2 | crousty | 3.5 → 8.5 | CROUSTY BINKS **10,00€ BOISSON COMPRISE !** · vue éclatée Riz / Crème fraîche / Aigre douce / Tenders · suppléments SAUCE PIQUANTE 0,50€ · SAUCE CRÈME 0,50€ · TENDERS 1€ · canette Coca cherry (boisson) |
| 3 | tacos | 8.5 → 13.5 | TACOS · NUGGETS / TENDERS / CORDON BLEU / POULET MARINÉ TANDOORI · **TACOS L 8,00€ · TACOS XL 11,00€ (choix entre 2 viandes)** · SAUCE FROMAGÈRE · CHOISIS TA SAUCE · vue éclatée galette / viande / frites / fromage / sauce |
| 4 | burgers | 13.5 → 24.5 | SANDWICH & HAMBURGER : 8 recettes, prix SEUL / MENU (voir FACTS §3), chaque recette avec mini vue éclatée, sandwich ET hamburger |
| 5 | kapsalone | 24.5 → 28.5 | KAPSALONE **10€** « Viande et sauce au choix » · couches frites / cheddar / viande / tomate / oignon rouge / salade / sauce · 5 viandes avec leurs sous-titres |
| 6 | hotdog | 28.5 → 31.5 | HOT DOG **5€** SAVEUR & CROUSTY · 5 ingrédients (ketchup moutarde miel, saucisse de poulet, oignon crispy, persil en décoration, cornichon) · vue éclatée |
| 7 | texmex | 31.5 → 38 | TEX-MEX : 8 produits et prix exacts (FACTS §6) |
| 8 | desserts | 38 → 45.5 | TIRAMISU 4,50€ (4 parfums) · MILKSHAKE 5,00€ (7 parfums) · CRÊPES 5,50€ · GAUFRES 5,50€ (4 parfums chacun) · suppléments fraise / coulis / boule de glace 0,50€ |
| 9 | drinks | 45.5 → 51 | MOJITOS 5,00€ (Fraise, Violette, Original, Pastèque, Bubble gum) · CANETTES 2,00€ (Coca-Cola cherry, Oasis tropical, Lipton pêche) · SAUCES 0,80€ (10 sauces) |
| 10 | end | 51 → 57 | (ajout client) la **vraie façade** (`assets/source/facade.png`, à découper/détourer : enseigne O'BINKS FAST FOOD, bandeau TASTE THE DIFFERENCE) + **Rue St Nicolas 460, 4000 Liège** + **0472 65 40 43** + « À EMPORTER · LIVRAISON » + note **4,8 ★ (61 avis Google)** · **LIVRAISON PARTOUT** · « On te livre directement chez toi ! » · « Indique ta commande détaillée et ton adresse complète » (petit écran de téléphone où la commande se tape) · **OUVERT 12h – 22h TOUS LES JOURS** · logo + TASTE THE DIFFERENCE · la toute dernière image = la première (boucle) |

## 3. Architecture technique (contrat — fichiers partagés en lecture seule)
Même moteur que le projet GSM Center (`src/main.js`, `src/engine/*`, `src/core/*`). Un segment =
`src/scenes/NN-id.js` :
```js
export const cues = [{ t: 0.5, type: 'impact', gain: 1 }];          // temps LOCAUX
export default function create(ctx) {   // ctx = { cfg, engine, scene, THREE, world, W, H, V, u, L, fps, seg }
  const group = new ctx.THREE.Group();
  return { group, camera(lt) { return { pos, target, roll, fov }; } /* PURE */, update(f) { /* … */ } };
}
```
- `f` = `{ t, lt, dur, p, W, H, V, u, L (zone sûre : L.safe = {l,r,t,b,w,h,cx,cy}), fps, fx (calque
  lumière additif avant bloom), ui (calque typo net), post, world, camera, cam, project([x,y,z]) }`.
- `f.post` : `ca, blur:[x,y], zoomBlur, zoomCenter, rollBlur, rgb, shock:[cx,cy,r,force], glitch,
  vignette, flash, flashColor, grain, bloom, fxGain, exposure, dof:{focus,aperture,maxblur}, uiBlur`.
- `world.images[id]` = photos du menu découpées : `{ img (HTMLImageElement), tex (THREE.Texture),
  w, h, ... }` — liste et ids dans `assets/menu/manifest.json` (agent Assets). Dessin 2D :
  `ui.drawImage(world.images.crousty.img, x, y, w, h)` ; 3D : plan avec `tex`.
- `src/world/food.js` (agent Food 3D) : produits 3D procéduraux avec vues éclatées
  (`createFood(kind, recipe)` → `{ group, layers, setExplode(p, t), anchors }`, voir l'en-tête du
  fichier). Créer les objets dans `create()`, jamais dans `update()`.
- `src/core/obinks.js` (agent Assets) : kit graphique de la marque (traits de pinceau, éclaboussures,
  étiquettes de prix néon, cadres néon, fumée, fond de rue de nuit, lampadaires, nappe à carreaux,
  titres brush avec contour) — à utiliser par toutes les scènes pour la cohérence.
- `f.bg` (et `world.bg`) : calque de FOND 2D (canvas plaqué au fond de la caméra, effacé en noir à chaque image) pour la rue de nuit, briques, fumée, lampadaires, éclaboussures de fond.
- `world.phones[0..1]` + `world/screens.js` : téléphones 3D (fin : commande tapée).
- `main.js` restaure l'état des objets partagés à chaque image (rendu déterministe).
- Le flou de mouvement auto ne voit pas les orbites autour d'une cible fixe : ajoute `post.blur`.

### Cues sonores (pour chaque événement fort, temps LOCAL)
Types : `impact`, `boom`, `hit`, `whoosh` (dur), `whip`, `riser` (pic à t+dur), `suck` (pic à t+dur),
`zap`, `glass`, `reverse` (dur), `click`, `type` (dur, cps), `tick`, `pop`, `swish`, `data`, `scan`,
`glitch`, `success`, `sub` (dur), `flash`, `drop`, **`sizzle`** (friture, dur), **`crunch`** (croquant),
**`splash`** (éclaboussure de peinture / sauce), **`pour`** (liquide, dur), **`fizz`** (canette/glaçons, dur).
Champs : `gain`, `pan`, `dur`, `cps`.

### Raccords (frontières)
Chaque segment finit par sa transition et le suivant démarre dans son prolongement (flash, fumée,
peinture, couleur pleine…). Les deux images de part et d'autre d'une frontière doivent se
raccorder visuellement (vérifie-les). Image 0 = image 56,983 (boucle) : fond noir + logo minuscule
qui va exploser, ou noir pur — l'agent intro et l'agent fin s'accordent sur : **noir #0a0a0b + petite
lueur rouge au centre (`seedPoint(f.fx, W, H, 1)`)**.

## 4. Formats
- **9:16** : produit en GRAND (60-75 % de la hauteur), textes plus gros et sur plusieurs lignes,
  rien d'important dans les 250 px du haut ni les 450 px du bas (sur 1920), marges 5 %.
- **16:9** : marges 5 %, composition large (produit d'un côté, prix/infos de l'autre, ou grilles).

## 5. Vérification (obligatoire, économe)
```bash
node scripts/render.mjs --still 4.0,5.5,7.2 --width 480 --height 270 --stills-dir out/stills/<toi>
node scripts/render.mjs --still 4.0,5.5,7.2 --format 9x16 --width 270 --height 480 --stills-dir out/stills/<toi>
cd out/stills/<toi> && ffmpeg -y -loglevel error -pattern_type glob -i '16x9-*.png' -filter_complex tile=4x2 h.png
```
Regarde les planches (une image Read par planche), corrige, recommence. Vérifie les deux formats
et les frontières. **Ne tue jamais de processus** (pas de kill/pkill), ne lance jamais de rendu
complet, utilise des dossiers `out/stills/<toi>` et `out/frames-<toi>` à toi.

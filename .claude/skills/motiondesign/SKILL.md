---
name: motiondesign
description: "Skill « MotionDesign » d'AP Design : produire des publicités en motion design 3D pour des commerçants (Reels/TikTok/Shorts en 9:16 et écrans de boutique en 16:9), dans le style des vidéos GSM Center « Portails », Prime N'Joy et AP Design. À utiliser dès que l'utilisateur dit « skills MotionDesign », « MotionDesign », « fais-moi une vidéo comme GSM Center / Prime N'Joy », ou demande une pub vidéo animée, un motion design, un reel publicitaire ou une vidéo pour un commerçant ou un client."
---

# MotionDesign — publicités motion design 3D d'AP Design

Quand l'utilisateur dit **« skills MotionDesign »** (ou demande une vidéo pub pour un commerçant), tu
produis une vidéo du niveau de **GSM Center « Portails »** (`projects/gsm-center-portails/`), et tu
fais **encore mieux** à chaque fois. L'utilisateur (AP Design) revend ces vidéos **300 à 500 €** :
la qualité doit être facturable, le délai court, et ta communication claire.

## 1. Ce que l'utilisateur attend (ses codes)

- **Plan-séquence 3D continu** : une seule caméra qui ne s'arrête jamais. Les transitions sont des
  **traversées d'écran de téléphone** (la caméra plonge dans l'écran, flash, on ressort ailleurs),
  toutes différentes : écran, carte mère, verre brisé qui se reforme, chute libre, portail.
- **Une histoire de client, étape par étape, vécue dans les écrans** :
  besoin → recherche tapée (curseur, dernier mot surligné) → le commerce trouvé (nom en GROS) →
  services en cartes qui glissent + pastilles → toucher (cercle + onde) sur « Itinéraire » /
  « Appeler » → ligne lumineuse jusqu'à la boutique → ville de nuit → final (adresse + appel à
  l'action). Compréhensible **sans le son**.
- **Effets** : téléphones 3D penchés en forte perspective qui pivotent en continu, typographie
  cinétique (slam, lettres découpées, masques, frappe), compteurs qui défilent, flous de
  mouvement forts, glitch RGB et aberration chromatique sur les temps forts, bloom, grain,
  vignettage, au moins **4 niveaux de mouvement à chaque seconde**, rythme 120 BPM.
- **Couleurs = l'identité exacte du client** (logo, site, affiche). Ne jamais imposer une autre
  palette : pour GSM Center, noir `#040605`, vert néon `#39ff14`, dégradé `#4dff4d → #14e0a0`,
  blanc `#f4f8f4`. Pour Prime N'Joy, le dégradé bleu → violet → magenta → orange de l'affiche.
- **Deux formats depuis le même code** : 16:9 (télés du magasin, marges 5 %) et 9:16
  **recomposé** (pas un recadrage : téléphones grands, textes plus gros sur plusieurs lignes, rien
  dans les 250 px du haut ni les 450 px du bas sur 1920).
- **60 i/s**, 1080p d'abord (rapide à montrer), 4K seulement si demandé.
- **Faits uniquement** : services, adresse, horaires, slogans tirés du site / des documents du
  client (fichier `FACTS.md`). N'invente jamais prix, promo, téléphone, horaires, avis ou
  statistiques. Marques tierces (Western Union, Ria…) écrites dans la typo de la pub, sans logo.
  Ce qui est souvent oublié et que l'utilisateur réclame : **tous les services confirmés**
  (ex. transferts d'argent Western Union / Ria) et **les horaires (« OUVERT 7J/7 »)** au final.
- **Voix off** : par défaut PAS de voix de synthèse (l'utilisateur les trouve robotiques).
  Musique + bruitages synchronisés. Une voix seulement s'il fournit un enregistrement réel.
- **Avant paiement** : livrer un **aperçu protégé** (filigrane « MAQUETTE • AP DESIGN »,
  720p, timecode, métadonnées) — jamais de tatouage sonore. Version propre après paiement.
- **Message au client** : ton simple et amical si c'est un pote (« Salut ! Je t'envoie l'aperçu… »).

## 2. Comment travailler (vite, sans brûler la limite d'usage de l'utilisateur)

1. **Copier le modèle** : `cp -r projects/gsm-center-portails projects/<client>-<nom>` (sans
   `out/`), `npm`-free : `node_modules` peut être copié depuis un autre projet. Lire
   `DIRECTION.md` (la bible : contrat des segments, raccords, cues, vérification) et l'adapter.
2. **Recueillir les faits** (photos, logo, affiche, site) → `FACTS.md` + `src/config.js`
   (palette, textes, adresse). Si un détail manque : choisir le meilleur et continuer, sans
   bloquer l'utilisateur de questions.
3. **Écrire l'histoire** en 6-9 segments de 2-4 s dans `src/timeline.json`, chacun dans
   `src/scenes/NN-id.js` (contrat : `camera(lt)` pure, objets créés dans `create`, `update(f)`,
   `export const cues`). Réutiliser les écrans vivants de `src/world/screens.js` (apps `find`,
   `store`, `map` avec `route`, `list`, `pills`, `counter`, `repair`, `portal`) en remplaçant
   noms, services et adresse.
4. **Vérifier en planches** : stills petits (480×270 / 270×480), plusieurs instants par commande,
   assemblés avec `ffmpeg … tile` → une seule image à regarder. Les deux formats, et les deux côtés
   de chaque frontière.
5. **Rendre** : `node scripts/render.mjs --format 16x9` puis `--format 9x16` (1080p 60 i/s,
   ≈ 2-3 s/image sur 4 cœurs ⇒ ~1 h 20 par format). **L'horizontale d'abord** (c'est celle que le
   client regarde), envoyer une copie légère (< 30 Mo, `scripts/deliver.sh` ou x264 ~7 Mb/s) dès
   qu'elle sort, puis la verticale.
6. **Livrer** : `bash scripts/deliver.sh` (H.264 compatible télés/USB + copies légères). Envoyer
   avec SendUserFile, donner un résumé en quelques lignes.

**Multi-agents (Workflow)** : seulement si l'utilisateur le demande (« version max », « fais à
fond ») ET que sa limite le permet. Un agent coûte ~0,5 M de tokens ; 2 agents simultanés max sur
cette machine. Toujours : bible commune d'abord, agents par paires de segments adjacents, revue
adversariale ensuite, son en parallèle. Sauvegarder (commit + push) à chaque étape et noter dans
`AVANCEMENT.md` où reprendre si la limite tombe.

## 3. Pièges connus (déjà payés une fois — ne pas les revivre)

- **`pkill -f <motif>` tue ton propre shell** si le motif apparaît dans la commande : tuer par PID
  (`ps -eo pid,args | grep … | awk '{print $1}'`).
- **Tâches de fond limitées à 2 h** : enchaîner par scripts relançables ; `render.mjs` reprend les
  images déjà présentes. Les images sont **supprimées après l'encodage** (sauf `--keep-frames`).
- **Modifier une scène après un rendu** : ne pas tout recalculer. Rendre seulement les passages
  modifiés (`--from/--to --no-audio --out clip.mp4 --frames-dir …`) et les **raccorder** dans le
  master avec `ffmpeg trim + concat` (voir `out/patch-*.sh` du projet GSM pour la recette).
- Les workers de rendu chargent le code **au démarrage** : un changement de code pendant un rendu
  n'est pas pris en compte ; supprimer les images concernées et relancer.
- Canvas 2D : `getContext('2d', { willReadFrequently: true })` + `g.reset()` à chaque image, sinon
  images périmées dans WebGL. Ne jamais désactiver une passe du composer (parité des buffers).
- `main.js` doit restaurer l'état partagé à chaque image (transforms, lumières, intensités) :
  rendu déterministe avec workers parallèles.
- Le halo du fond studio à pleine intensité donne un voile coloré : garder un noir profond.
- Le flou de mouvement automatique ne voit pas les orbites autour d'une cible fixe : ajouter
  `post.blur` à la main. Scènes trop lumineuses (bloom + émissifs) : baisser `post.exposure`,
  `post.bloom`, `fxGain`, et ajouter un voile sombre doux derrière les textes sur fond clair.
- Disque limité (~10 Go libres) : 1800 PNG 1080p ≈ 5 Go ; nettoyer les anciens rendus.

## 4. Communication avec l'utilisateur

Français, phrases courtes, ton direct. Il est pressé et paie à l'usage : **toujours** donner un
délai honnête, prévenir avant un long calcul, envoyer quelque chose de montrable le plus tôt
possible, ne jamais rester silencieux pendant un long travail. Ne pas lancer de travail lourd
(multi-agents, 4K, refonte complète) sans son accord explicite.

## 5. Faire encore mieux à chaque nouvelle vidéo

Checklist qualité avant envoi : histoire lisible sans le son · nom du commerce en très gros au
moins deux fois · adresse + horaires + tous les services confirmés · appel à l'action clair ·
aucune image cramée ou « bouillie de couleur » · textes nets dans les zones sûres des deux formats ·
raccords sans saut · son calé sur chaque impact · boucle parfaite (dernière image = première) ·
fichiers H.264 lisibles partout. Idées d'amélioration : vrais reflets (Reflector) au final,
visuels du client (photos de vitrine, produits) intégrés dans les écrans, logo vectorisé du client,
voix réelle enregistrée par le client, déclinaisons 6 s / 15 s pour la pub payante.

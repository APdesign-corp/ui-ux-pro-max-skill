# Informations extraites de la source

Sources analysées : `site-version-premium.html` et `site-demo.html`, les deux maquettes du site
fournies par le client. **Chaque texte de la publicité vient de cette liste.** Aucune autre
information commerciale n'est utilisée.

| Donnée | Valeur | Où dans la source |
|---|---|---|
| Nom | GSM Center Liège | `<title>`, JSON-LD `name` |
| Adresse | Rue St Léonard 203, 4000 Liège | JSON-LD `address`, section contact |
| Téléphone | 0484 65 60 61 (+32 484 65 60 61) | JSON-LD `telephone`, `tel:+32484656061` |
| Ouverture | 7j/7 (lun–ven 9h–19h, sam 10h–19h, dim 11h–19h) | badge hero `7J/7`, JSON-LD `openingHoursSpecification` |
| Slogan | « Ton téléphone, notre spécialité. » | `h1` de la version premium |
| Accroche | « Tout pour ton mobile, au même endroit. » | `h2` section services |
| Étape 01 | 01 — CHOISIR · Les derniers smartphones · Neufs & reconditionnés | bloc `.steps` / `.caps` |
| Étape 02 | 02 — RÉPARER · Réparation rapide · Écran, batterie, connecteur… & livraison | bloc `.steps` / `.caps` |
| Étape 03 | 03 — S'ÉQUIPER · Accessoires & multimédia · Coques, chargeurs, écouteurs, internet | bloc `.steps` / `.caps` |
| Service | Téléphonie mobile : smartphones et cartes SIM | bento services |
| Service | Réparation & livraison : diagnostic rapide, réparation soignée, livraison possible | bento services |
| Service | Internet | bento services |
| Service | Multimédia : écouteurs, chargeurs, coques, accessoires | bento services |
| Service | Western Union : « Envoyez et recevez de l'argent ici, simplement. » | bento services |
| Service | Ria : « Transferts d'argent vers l'international. » | bento services |
| Avis | 4,7 / 5 · 155 avis Google | JSON-LD `aggregateRating` (**désactivé** par défaut dans la pub, voir `config.js`) |

## Identité visuelle relevée

- Fonds : `#040605` (premium), `#050505` (démo)
- Vert néon : `#39ff14` (démo), `#4dff4d` + dégradé vers `#14e0a0` (premium)
- Blanc `#f4f8f4`, gris atténué `#93a095`, gris métal `#b2b8be` / `#7c838a`
- Typographie : Space Grotesk (démo), demandée par le brief
- Logo : un « G » sombre dans un carré arrondi en dégradé `#4dff4d → #14e0a0`, suivi du mot « GSM Center »
- Motifs : grille fine, anneaux concentriques, halos verts flous, grain, particules, téléphones en 3D
  avec la gravure « GSM CENTER » au dos
- Icônes SVG (24×24, trait) : téléphone, clé (réparation), wifi (internet), casque (multimédia),
  avion en papier (Western Union), globe (Ria). Elles sont reprises **telles quelles** dans
  `assets/svg/source-icons.svg`.

## Volontairement non utilisé

- Les durées « 30 min » et « 20 min » affichées sur les écrans de la maquette : ce sont des éléments
  décoratifs de la démo, pas un engagement commercial confirmé.
- Les logos officiels de Western Union et de Ria : ce sont des marques déposées. Les noms sont donc
  composés dans la typographie de la pub. Pour mettre les logos officiels, remplacez-les par les SVG
  du kit partenaire (voir le README).

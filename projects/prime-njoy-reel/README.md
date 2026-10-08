# Prime N'Joy — Reel motion design (MAQUETTE)

Reel vertical 9:16 (1080×1920, 30 i/s, ~20,7 s) pour **Prime N'Joy** (Télécom • Énergie), construit
uniquement à partir du logo et de l'affiche fournis (`assets/brand/`). Il utilise le même moteur que le
Reel AP Design : Three.js, Canvas 2D et post-production, avec un rendu image par image.

## Maquette protégée

Tant que la prestation n'est pas payée, chaque image porte un **filigrane** :
- « MAQUETTE • AP DESIGN » en diagonale sur tout l'écran ;
- un grand « MAQUETTE » central ;
- un bandeau « Aperçu non contractuel — diffusion interdite » ;
- un compteur « APERÇU x.xx s » qui empêche de recadrer proprement.

Version définitive sans filigrane : `node scripts/render.mjs ... ` avec `?wm=0`. Dans `render.mjs`,
ajoute `wm=0` aux paramètres d'URL, ou mets `watermark.enabled: false` dans `src/config.js`.

## Storyboard (calé mot à mot sur la voix off féminine)

| Scène | Voix | Image | Transition de sortie |
|---|---|---|---|
| 01 Accroche | « Internet, télé, mobile… Vous payez encore trop cher ? » | Fond clair « aurore ». Une pastille-icône apparaît par mot. Sur « cher », l'étiquette 86,99 €/mois s'écrase, tremble et se fissure. | points de marque qui grossissent |
| 02 Réuni | « Avec Prime N'Joy, tout est réuni. » | Bleu nuit. Les points tourbillonnent et forment le cercle du logo, puis PRIME N'JOY s'écrit. Les icônes sont aspirées au centre (onde de choc). | zoom à travers le trou du logo (iris) |
| 03 Produits | « La télé. Internet. Le GSM. » | Studio 3D clair : la TV s'allume, la box tombe et émet des ondes Wi-Fi, le smartphone arrive en tournant. Une étiquette par mot. | balayage diagonal en dégradé |
| 04 Offre | « Le tout pour 45 € par mois. » | Carte en dégradé qui se retourne. Compteur 86 → **45 €** qui s'écrase, avec des confettis. L'ancien prix 86,99 € est barré. Pastille TV + INTERNET + GSM. | éclair « énergie » + flash |
| 05 Promesse | « Plus qu'une connexion, un meilleur quotidien. » | La typographie de l'affiche, ligne par ligne, avec « connexion » en dégradé animé. La 3D flotte, floue, en arrière-plan. | dispersion du texte en points |
| 06 Signature | « Prime N'Joy. Télécom et énergie. Ensemble, allons plus loin. » | Les points reforment le logo, puis PRIME (bleu) N'JOY (orange), les pastilles TÉLÉCOM \| ÉNERGIE, la signature et une vague de dégradé. | fondu au blanc (boucle) |

## Voix off

- Voix féminine Supertonic 3 (voix 2), différente de celle d'AP Design.
- Chaque phrase est générée en plusieurs prises et la plus claire est retenue par deux juges ASR.
- « Vous payez encore trop cher ? » est écrit phonétiquement (« Vou pé-yé encore trop chère ? »), car c'était la seule graphie que ce modèle prononçait correctement.
- La voix est accélérée ×1,12, sans changer sa hauteur.

```bash
python3 scripts/build_timeline.py && python3 scripts/sound_design.py
node scripts/render.mjs --width 1080 --height 1920 --workers 3 --out out/prime-njoy-1080x1920.mp4
```

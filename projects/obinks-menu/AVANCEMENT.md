# Avancement — O'BINKS (pour reprendre exactement où on s'est arrêté)

| Étape | État |
|---|---|
| 0. Socle : projet, polices, captures, FACTS.md, palette, calque de fond, timeline, bible DIRECTION.md | ✅ fait (commit « obinks foundation ») |
| 1. Fondations (agents) : Food 3D (`src/world/food.js`) · Assets + kit graphique (`assets/menu/`, `src/core/obinks.js`) | ⏳ |
| 2. Scènes (agents) : 1-2 · 3-4 · 5-6 · 7-8 · 9-10 | ⏳ |
| 3. Revues artistiques (2 directeurs, plusieurs tours) + son | ⏳ |
| 4. Contrôle qualité indépendant (prix, textes, zones sûres, boucle) | ⏳ |
| 5. Rendus 1080p 60 i/s : 9:16 puis 16:9, livraison | ⏳ |

Workflow lancé : run `wf_4a49b1ec-3b8`, script `scripts/workflow-obinks.js`.
Reprise : relancer le workflow (scriptPath = scripts/workflow-obinks.js) avec `resumeFromRunId: wf_4a49b1ec-3b8` (les agents terminés sont en cache), ou
reprendre à l'étape marquée ⏳ la plus haute.


## Version courte 48 s (demande client)
Timeline : intro 0-3 · crousty 3-7 · tacos 7-11 · burgers 11-19 · kapsalone 19-22.5 · hotdog 22.5-25 · texmex 25-30 · desserts 30-35.5 · drinks 35.5-40 · end 40-48.
Workflow : scripts/workflow-obinks-48s.js (retime 01-04, build 05-10, revues, son, QA).

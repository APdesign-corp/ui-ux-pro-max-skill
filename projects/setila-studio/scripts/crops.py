#!/usr/bin/env python3
"""Découpes des photos utiles depuis les captures (coordonnées en px d'affichage 924 de large → ×1.2662).
Aucune retouche de personne : uniquement recadrage, suppression de l'interface Instagram,
et (photo d'ouverture) effacement du texte SETILA peint sur le MUR (fond), par interpolation verticale."""
import os
from PIL import Image, ImageFilter
import numpy as np
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1170 / 924
def crop(src, box, out, up=1.0, sharpen=False):
    im = Image.open(f'{R}/assets/source/{src}.png').convert('RGB')
    x0, y0, x1, y1 = [round(v * S) for v in box]
    c = im.crop((x0, y0, x1, y1))
    if up != 1.0:
        c = c.resize((round(c.width * up), round(c.height * up)), Image.LANCZOS)
    if sharpen:
        c = c.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    c.save(f'{R}/assets/img/{out}.jpg', quality=93)
    return c

# ouverture : photo de la formatrice, intacte ; on efface seulement « SETILA » sur le mur
c = crop('post-formatrice', (0, 343, 924, 1410), 'formatrice')
a = np.asarray(c).astype(np.float32)
x0, x1 = round(352 * S), round(590 * S)
y0, y1 = round((588 - 343) * S), round((678 - 343) * S)
top, bot = a[y0 - 3:y0].mean(0), a[y1:y1 + 3].mean(0)
for j, y in enumerate(range(y0, y1)):
    k = j / (y1 - y0)
    a[y, x0:x1] = (top * (1 - k) + bot * k)[x0:x1]
Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.SMOOTH).save(f'{R}/assets/img/formatrice.jpg', quality=94)
# re-colle la personne non lissée (seule la zone mur a été modifiée)
orig = np.asarray(Image.open(f'{R}/assets/source/post-formatrice.png').convert('RGB').crop((0, round(343*S), round(924*S), round(1410*S))))
out = np.asarray(Image.open(f'{R}/assets/img/formatrice.jpg')).copy()
mask = np.zeros(out.shape[:2], bool); mask[y0 - 6:y1 + 6, x0 - 6:x1 + 6] = True
out[~mask] = orig[~mask]
Image.fromarray(out).save(f'{R}/assets/img/formatrice.jpg', quality=95)

crop('cateyes-1', (0, 585, 924, 1278), 'cils-cateyes-1')
crop('cateyes-2', (0, 585, 924, 1278), 'cils-cateyes-2')
crop('wispy', (0, 728, 924, 1400), 'cils-wispy-brun')
# vignettes de la grille (icônes de lecture exclues), agrandies ×2.4
G = dict(c1=(4, 301), c2=(313, 610), c3=(622, 920))
def cell(src, col, y0, y1, out): crop(src, (G[col][0], y0, G[col][1], y1), out, up=2.4, sharpen=True)
cell('grille-1', 'c1', 460, 806, 'rehaussement-reaction')
cell('grille-1', 'c2', 460, 806, 'rehaussement-regard')
cell('grille-1', 'c3', 870, 1218, 'browlift-mapping')
cell('grille-1', 'c2', 1280, 1629, 'cils-freckles')
cell('grille-1', 'c1', 1690, 2000, 'sourcils-browlift')
cell('grille-1', 'c1', 1222, 1629, 'collage-avis')
cell('grille-2', 'c2', 695, 1102, 'cils-mapping')
cell('grille-2', 'c1', 1165, 1512, 'rehaussement-yeux-verts')
cell('profil', 'c1', 1655, 1990, 'cils-yeux-verts')
cell('profil', 'c3', 1655, 1990, 'cils-yeux-bruns')
crop('produits-brows', (0, 500, 924, 1750), 'browlift-produits')
crop('papouilles-ambiance', (0, 570, 924, 1640), 'papouilles-ambiance')
crop('strass-photo-1', (0, 300, 924, 1180), 'strass-1')
crop('strass-photo-2', (0, 240, 924, 1560), 'strass-2')
print('ok')

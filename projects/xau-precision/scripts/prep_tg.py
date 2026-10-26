# Prépare les médias du canal Telegram : bande de la galerie (sans les captures de virements
# ni la conversation sur les dépôts) + photos recadrées (sans les barres noires du lecteur).
from PIL import Image, ImageOps
import numpy as np
S = 1.266
def crop(f, y0, y1): im = Image.open(f).convert('RGB'); return im.crop((0, int(y0 * S), im.width, int(y1 * S)))
parts = [crop('assets/tg/gal1.png', 380, 1640), crop('assets/tg/gal2.png', 500, 1960), crop('assets/tg/gal3.png', 700, 1960), crop('assets/tg/gal4.png', 650, 1890)]
W = 600
parts = [p.resize((W, round(p.height * W / p.width)), Image.LANCZOS) for p in parts]
strip = Image.new('RGB', (W, sum(p.height for p in parts)))
y = 0
for p in parts: strip.paste(p, (0, y)); y += p.height
strip.save('assets/tg/strip.jpg', quality=90); print('strip', strip.size)
for i in range(1, 8):
    im = Image.open(f'assets/tg/ph{i}.png').convert('RGB')
    a = np.asarray(im).astype(int).sum(2)
    a[:int(140 * S)] = 0
    ys, xs = np.where(a > 75)
    box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(im.width, xs.max() + 4), min(im.height, ys.max() + 4))
    c = im.crop(box); c.thumbnail((900, 1400), Image.LANCZOS); c.save(f'assets/tg/c{i}.jpg', quality=90); print(i, c.size)

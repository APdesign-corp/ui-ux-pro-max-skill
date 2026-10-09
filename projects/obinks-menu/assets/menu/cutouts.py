#!/usr/bin/env python3
"""
O'BINKS — découpes des visuels du menu (captures client assets/source/menu-1..9.png, 1170×2532).

Produit assets/menu/<id>.png (RGBA, alpha = masque doux) + assets/menu/manifest.json.
Reproductible : `python3 assets/menu/cutouts.py [id ...]` (sans argument : tout).

Principe de chaque découpe (coordonnées en pixels de la capture source) :
  - `shapes` : polygones / ellipses / rectangles qui délimitent le produit (union), lissés
    (Chaikin) puis adoucis (flou gaussien `feather` px) → jamais de bord coupé net ;
  - `cut`    : zones retirées (étiquettes de prix, titres du menu qui chevauchent le produit) ;
  - `key`    : clé de luminance qui rend le fond sombre transparent (bords doux) :
        kind 'max'   = max(R,G,B)          (fond noir)
             'lum'   = luminance           (fond noir texturé)
             'g'     = 0.15R+0.7G+0.15B    (fond noir + lueurs rouges : le rouge néon disparaît)
             'white' = écart au blanc      (mojitos sur carte blanche)
             'red'   = anti-néon rouge     (en clé secondaire key2 : retire peinture/néon rouges du menu)
        lo/hi  : seuils de la rampe (smoothstep) ;
        fill   : bouche les trous intérieurs (zones sombres DANS l'aliment : viande, chocolat…)
                 jusqu'à `fillmax` px d'aire ;
        band   : si présent, l'intérieur de la forme (érodée de `band` px) est forcé opaque et la
                 clé n'agit que sur la bordure (aliments sombres sur fond sombre : boîte noire…).
  - Aucun texte ni prix du menu n'est conservé (on les réécrit dans la vidéo), sauf les logos.
"""
import json, sys, os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'source')

# ----------------------------------------------------------------------------- formes utiles
def poly(*pts): return ('poly', list(pts))
def rect(x0, y0, x1, y1): return ('poly', [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
def ell(cx, cy, rx, ry=None): return ('ell', (cx, cy, rx, ry if ry is not None else rx))
def pot(cx, top, bot):
    return poly((cx - 86, top + 6), (cx - 64, top), (cx + 64, top), (cx + 86, top + 6), (cx + 84, top + 27),
                (cx + 73, bot - 13), (cx + 56, bot), (cx - 56, bot), (cx - 73, bot - 13), (cx - 84, top + 27))
def tpot(cx):  # petit pot de sauce noir (capture 1, rangée « CHOISIS TA SAUCE »)
    return poly((cx - 41, 2119), (cx - 36, 2108), (cx + 36, 2108), (cx + 41, 2119), (cx + 38, 2150),
                (cx + 33, 2187), (cx - 33, 2187), (cx - 38, 2150))

BURGER_KEY = dict(kind='g', lo=55, hi=110, band=9, fill=True, fillmax=3000)
DARK_KEY = dict(kind='max', lo=30, hi=80, fill=True, fillmax=6000)
TEX_KEY = dict(kind='g', lo=40, hi=90, fill=True, fillmax=4000)
DESSERT_KEY = dict(kind='max', lo=18, hi=48, fill=True, fillmax=20000)
MOJITO_KEY = dict(kind='white', lo=38, hi=95, fill=True, fillmax=9000, key2=dict(kind='max', lo=40, hi=85))
KAPS_KEY = dict(kind='max', lo=35, hi=80, fill=True, fillmax=1800)

# ----------------------------------------------------------------------------- catalogue
S = {}
def add(id_, src, label, shapes, cut=(), key=None, feather=3.0, smooth=2, **extra):
    S[id_] = dict(src=src, label=label, shapes=shapes, cut=list(cut), key=key, feather=feather, smooth=smooth, extra=extra)

# --- Logos
add('logo', 8, "Logo O'BINKS (O rouge + BINKS blanc, lettrage brush, liseré blanc)",
    [rect(96, 318, 1068, 716)], key=dict(kind='max', lo=22, hi=70, fill=True, fillmax=10**7), feather=1.5, smooth=0)
add('logo_slogan', 5, "Logo O'BINKS + TASTE THE DIFFERENCE (capture 5)",
    [rect(318, 182, 852, 502)], cut=[rect(818, 486, 860, 510)], key=dict(kind='max', lo=40, hi=95, fill=True, fillmax=600), feather=1.5, smooth=0)
add('logo_alt', 6, "Logo O'BINKS (variante, capture 6)",
    [rect(186, 276, 912, 528)], key=dict(kind='max', lo=55, hi=110, fill=True, fillmax=10**7), feather=1.5, smooth=0)

# --- Capture 1 : Crousty Binks, tacos
add('crousty', 1, "Crousty Binks : barquette noire O'BINKS, riz, tenders, sauces",
    [poly((330, 494), (470, 492), (480, 483), (800, 481), (840, 500), (862, 560), (872, 680), (872, 900), (860, 945),
          (830, 975), (800, 996), (560, 1003), (430, 996), (412, 960), (330, 955), (290, 942), (262, 915), (225, 860),
          (212, 780), (218, 700), (240, 620), (262, 570), (300, 525))],
    cut=[poly((250, 430), (340, 430), (340, 505), (318, 548), (280, 560), (250, 560))],
    key=dict(kind='max', lo=16, hi=48, band=12, key2=dict(kind='red', lo=30, hi=80)), feather=2.5, despeckle=200)
add('coca_cherry', 1, 'Canette Coca-Cola cherry (boisson du Crousty Binks)',
    [poly((48, 500), (56, 480), (140, 472), (222, 478), (232, 500), (234, 875), (140, 880), (46, 875))],
    feather=1.8, fade=(874, 30))
for id_, label, pts in [
    ('tacos_nuggets', 'Tacos nuggets', [(60, 1590), (100, 1572), (170, 1572), (235, 1585), (258, 1610), (268, 1660), (262, 1740), (250, 1790), (200, 1810), (110, 1814), (50, 1802), (26, 1760), (24, 1700), (35, 1640)]),
    ('tacos_tenders', 'Tacos tenders', [(310, 1590), (360, 1568), (450, 1568), (520, 1580), (540, 1610), (548, 1680), (545, 1760), (525, 1802), (470, 1814), (360, 1814), (300, 1802), (283, 1750), (283, 1680), (295, 1620)]),
    ('tacos_cordonbleu', 'Tacos cordon bleu', [(600, 1590), (650, 1568), (740, 1568), (800, 1580), (822, 1610), (832, 1680), (830, 1760), (810, 1802), (750, 1814), (640, 1814), (590, 1802), (573, 1750), (573, 1680), (585, 1620)]),
    ('tacos_tandoori', 'Tacos poulet mariné tandoori', [(890, 1590), (940, 1568), (1030, 1568), (1095, 1585), (1115, 1615), (1124, 1690), (1120, 1770), (1100, 1806), (1040, 1814), (930, 1814), (875, 1802), (858, 1750), (858, 1680), (870, 1620)]),
]:
    add(id_, 1, label, [poly(*pts)], key=DARK_KEY)
add('sauce_fromagere', 1, 'Pot de sauce fromagère (tacos)',
    [poly((300, 2100), (310, 2075), (350, 2062), (430, 2062), (470, 2075), (482, 2100), (476, 2140), (460, 2180), (420, 2194),
          (360, 2194), (325, 2182), (305, 2140))], key=dict(kind='max', lo=14, hi=45, band=8), feather=2)
add('sauces_tacos', 1, 'Rangée de 6 pots de sauce (CHOISIS TA SAUCE, tacos)',
    [tpot(c) for c in (568, 658, 748, 838, 925, 1012)], key=dict(kind='max', lo=12, hi=40, band=6), feather=1.8)
add('supp_piquante', 1, 'Icône piment (supplément sauce piquante)', [rect(1056, 636, 1122, 702)],
    key=dict(kind='max', lo=40, hi=95, fill=True, fillmax=400), feather=1.5, smooth=0)
add('supp_creme', 1, 'Icône pot de sauce crème (supplément)', [rect(1050, 826, 1124, 886)],
    key=dict(kind='max', lo=40, hi=95, fill=True, fillmax=800), feather=1.5, smooth=0)
add('supp_tenders', 1, 'Icône tender (supplément tenders)',
    [poly((1008, 1080), (1030, 1040), (1080, 1008), (1118, 993), (1136, 998), (1136, 1030), (1100, 1062), (1060, 1086), (1030, 1095), (1008, 1095))],
    key=dict(kind='g', lo=40, hi=95, fill=True, fillmax=800), feather=1.5, smooth=1, despeckle=150)

# --- Capture 4 : sandwichs (baguette) et hamburgers — bas du pain masqué par les étiquettes du menu
SANDW = {  # (polygone, y du fondu bas = haut des étiquettes SEUL/MENU)
    'ocheesy': ([(26, 545), (32, 500), (50, 476), (95, 462), (150, 458), (220, 457), (300, 459), (360, 466), (395, 482), (412, 510), (415, 550), (412, 580), (408, 593), (28, 593), (24, 580)], 591),
    'doublesmash': ([(416, 545), (420, 505), (440, 486), (480, 474), (515, 472), (690, 472), (740, 477), (770, 492), (782, 520), (784, 560), (780, 593), (418, 593)], 591),
    'raclette': ([(792, 545), (796, 505), (815, 484), (860, 470), (950, 467), (1050, 468), (1110, 478), (1140, 495), (1152, 525), (1152, 570), (1146, 593), (796, 593)], 591),
    'ocrispy': ([(22, 860), (30, 812), (45, 782), (80, 763), (150, 754), (250, 750), (340, 752), (385, 764), (405, 790), (415, 830), (413, 865), (405, 891), (26, 891)], 889),
    'opepper': ([(418, 850), (422, 800), (440, 776), (480, 761), (600, 755), (720, 760), (760, 776), (780, 805), (782, 850), (778, 891), (420, 891)], 889),
    'chevremiel': ([(788, 860), (795, 810), (815, 781), (860, 768), (950, 763), (1060, 764), (1120, 774), (1145, 796), (1152, 840), (1150, 891), (790, 891)], 889),
    'barbecue': ([(55, 1140), (58, 1105), (75, 1086), (100, 1072), (140, 1056), (180, 1048), (220, 1041), (260, 1033), (300, 1025), (340, 1013), (380, 1006), (430, 1008), (490, 1026), (535, 1052), (555, 1090), (558, 1140), (556, 1162), (58, 1162)], 1160),
    'bigbinks': ([(618, 1150), (625, 1102), (650, 1080), (715, 1068), (850, 1066), (930, 1059), (990, 1056), (1070, 1064), (1105, 1080), (1122, 1110), (1122, 1160), (1118, 1162), (620, 1162)], 1160),
}
SANDW_PATCH = {}
BURG = {
    'ocheesy': ([(115, 1520), (120, 1482), (135, 1457), (165, 1437), (210, 1426), (250, 1424), (290, 1426), (330, 1438), (360, 1457), (372, 1482), (376, 1520), (374, 1554), (113, 1554)], 1552),
    'doublesmash': ([(462, 1520), (466, 1495), (480, 1477), (510, 1463), (560, 1456), (600, 1455), (650, 1457), (700, 1467), (722, 1481), (738, 1500), (740, 1554), (463, 1554)], 1552),
    'raclette': ([(843, 1525), (848, 1490), (865, 1469), (900, 1456), (950, 1452), (1000, 1456), (1035, 1469), (1052, 1490), (1058, 1525), (1056, 1554), (844, 1554)], 1552),
    'ocrispy': ([(80, 1815), (88, 1780), (105, 1757), (130, 1738), (180, 1726), (230, 1722), (280, 1726), (330, 1738), (360, 1757), (375, 1780), (382, 1815), (380, 1836), (81, 1836)], 1834),
    'opepper': ([(452, 1810), (458, 1780), (475, 1754), (505, 1733), (550, 1723), (600, 1720), (650, 1723), (695, 1733), (722, 1754), (735, 1780), (738, 1810), (736, 1836), (454, 1836)], 1834),
    'chevremiel': ([(810, 1815), (818, 1785), (835, 1760), (865, 1738), (910, 1725), (955, 1721), (1000, 1725), (1045, 1738), (1072, 1760), (1090, 1785), (1102, 1815), (1100, 1836), (811, 1836)], 1834),
    'barbecue': ([(140, 2050), (150, 2020), (172, 2000), (178, 1985), (190, 1960), (215, 1944), (260, 1934), (323, 1930), (385, 1934), (430, 1944), (456, 1960), (468, 1985), (475, 2000), (500, 2010), (520, 2040), (518, 2082), (142, 2082)], 2080),
    'bigbinks': ([(712, 2060), (716, 2012), (738, 1998), (758, 1994), (761, 1980), (769, 1960), (785, 1941), (821, 1934), (851, 1931), (886, 1929), (920, 1931), (950, 1934), (986, 1941), (1001, 1960), (1009, 1980), (1012, 1994), (1030, 1998), (1044, 2012), (1044, 2082), (712, 2082)], 2080),
}

BURG_PATCH = {
    'barbecue': [dict(region=rect(150, 1915, 322, 1994), axis=323, a=175, b=471)],
    'bigbinks': [dict(region=rect(700, 1915, 885, 1986), axis=886, a=760, b=1010)],
}
NAMES = {'ocheesy': "O'CHEESY", 'doublesmash': 'DOUBLE SMASH', 'raclette': 'RACLETTE', 'ocrispy': "O'CRISPY",
         'opepper': "O'PEPPER", 'chevremiel': 'CHÈVRE MIEL', 'barbecue': 'BARBECUE', 'bigbinks': 'BIG BINKS'}
for k, (pts, fy) in SANDW.items():
    add(f'sandwich_{k}', 4, f'Sandwich (baguette) {NAMES[k]} — bas en fondu (masqué par les prix sur le menu)', [poly(*pts)],
        key=BURGER_KEY, feather=2.5, fade=(fy, 16), patch=SANDW_PATCH.get(k, []), recipe=NAMES[k])
for k, (pts, fy) in BURG.items():
    add(f'burger_{k}', 4, f'Hamburger {NAMES[k]} — bas en fondu (masqué par les prix sur le menu)', [poly(*pts)],
        key=BURGER_KEY, feather=2.5, fade=(fy, 16), patch=BURG_PATCH.get(k, []), recipe=NAMES[k])

# --- Capture 6 : Kapsalone (pile éclatée) + couches en bandes horizontales
KX0, KX1 = 14, 592
add('kapsalone', 6, 'Kapsalone complet (pile éclatée : salade+sauce, oignon, tomate, cheddar, viande, frites, barquette)',
    [rect(KX0, 562, KX1, 1960)], key=KAPS_KEY, feather=2.5, smooth=0)
for id_, label, y0, y1 in [
    ('kapsalone_salade', 'Kapsalone : salade + sauce', 562, 838),
    ('kapsalone_oignon', 'Kapsalone : oignon rouge', 842, 988),
    ('kapsalone_tomate', 'Kapsalone : tomate', 986, 1168),
    ('kapsalone_cheddar', 'Kapsalone : cheddar fondu', 1164, 1302),
    ('kapsalone_viande', 'Kapsalone : viande (poulet)', 1296, 1612),
    ('kapsalone_frites', 'Kapsalone : frites + barquette alu', 1608, 1960),
]:
    key = dict(KAPS_KEY, fill=(id_ != 'kapsalone_oignon'))
    add(id_, 6, label, [rect(KX0, y0, KX1, y1)], key=key, feather=2.5, smooth=0, layer=True)

# --- Capture 5 : hot dogs + 5 ronds d'ingrédients
HD_FRONT = [(10, 1300), (20, 1240), (50, 1110), (100, 1058), (170, 1038), (260, 1058), (400, 1108), (560, 1188), (700, 1278), (800, 1338), (862, 1398), (872, 1460), (858, 1540), (800, 1600), (760, 1680), (700, 1702), (600, 1702), (450, 1662), (300, 1602), (150, 1522), (50, 1452), (15, 1382)]
HD_BACK = [(488, 1000), (500, 958), (540, 898), (600, 848), (700, 833), (800, 858), (900, 898), (1000, 958), (1100, 1018), (1168, 1058), (1170, 1292), (1100, 1302), (1000, 1272), (850, 1222), (700, 1162), (560, 1092), (500, 1052)]
HD_KEY = dict(kind='food', lo=40, hi=95, fill=True, fillmax=8000, band=22)
HD_CUT = [ell(975, 1640, 180)]
add('hotdog', 5, 'Les deux hot dogs (saucisse de poulet, ketchup-moutarde-miel, oignon crispy, persil, cornichon)',
    [poly(*HD_FRONT), poly(*HD_BACK)], cut=HD_CUT, key=HD_KEY)
add('hotdog_front', 5, 'Hot dog (premier plan)', [poly(*HD_FRONT)], cut=HD_CUT, key=HD_KEY)
add('hotdog_back', 5, 'Hot dog (arrière-plan)', [poly(*HD_BACK)], key=HD_KEY)
for i, (cx, label) in enumerate([(132, 'KETCHUP MOUTARDE MIEL'), (357, 'SAUCISSE DE POULET'), (587, 'OIGNON CRISPY'),
                                 (812, 'PERSIL EN DÉCORATION'), (1042, 'CORNICHON')], 1):
    add(f'hotdog_ing_{i}', 5, f'Rond ingrédient hot dog : {label}', [ell(cx, 1938, 107)],
        key=dict(kind='max', lo=30, hi=80, band=14), feather=2, smooth=0, ingredient=label)

# --- Capture 3 : tex-mex, frites, canettes, sauces
add('texmex_tenders', 3, 'Tenders (barquette)',
    [poly((62, 640), (70, 588), (110, 565), (180, 561), (262, 556), (300, 512), (350, 504), (410, 499), (470, 504), (530, 514), (565, 540), (578, 590), (578, 640), (570, 668), (66, 668))],
    key=dict(TEX_KEY, band=9), fade=(668, 18))
add('texmex_nuggets', 3, 'Nuggets (barquette)',
    [poly((642, 660), (648, 612), (680, 582), (740, 562), (762, 547), (800, 537), (870, 539), (940, 546), (966, 561), (975, 600), (1045, 602), (1075, 626), (1082, 660), (1078, 698), (642, 698))],
    key=dict(TEX_KEY, band=9), fade=(698, 18))
add('texmex_wings', 3, 'Wings (barquette)',
    [poly((110, 960), (120, 922), (160, 906), (240, 900), (270, 862), (290, 842), (350, 834), (450, 830), (520, 840), (556, 870), (565, 920), (575, 960), (562, 985), (110, 985))],
    key=dict(TEX_KEY, band=9), fade=(985, 16))
add('texmex_mozza', 3, 'Mozza sticks (fromage filant)',
    [poly((652, 960), (660, 915), (700, 895), (740, 880), (865, 878), (880, 850), (920, 830), (965, 830), (985, 860), (1040, 890), (1048, 930), (1040, 965), (900, 965), (895, 1040), (870, 1062), (820, 1068), (720, 1068), (675, 1058), (655, 1020))],
    cut=[rect(898, 962, 1100, 1090)], key=dict(kind='food', lo=40, hi=95, fill=True, fillmax=5000))
add('texmex_camembert', 3, 'Croq camembert',
    [poly((140, 1250), (150, 1210), (180, 1192), (240, 1188), (300, 1195), (340, 1180), (345, 1140), (380, 1125), (440, 1122), (490, 1145), (505, 1190), (500, 1232), (390, 1236), (384, 1290), (372, 1320), (330, 1340), (230, 1342), (170, 1325), (145, 1295))],
    cut=[rect(382, 1232, 560, 1345)], key=dict(kind='food', lo=40, hi=95, fill=True, fillmax=5000))
add('texmex_jalapenos', 3, 'Jalapenos crème',
    [poly((730, 1260), (740, 1215), (770, 1196), (860, 1192), (905, 1190), (905, 1150), (940, 1122), (1000, 1120), (1040, 1140), (1055, 1190), (1050, 1238), (955, 1240), (948, 1290), (930, 1325), (870, 1340), (780, 1338), (742, 1310))],
    cut=[rect(948, 1236, 1130, 1345)], key=dict(kind='food', lo=40, hi=95, fill=True, fillmax=5000))
add('frites_cheddar', 3, 'Frites cheddar bacon',
    [poly((28, 1550), (36, 1522), (80, 1512), (180, 1509), (300, 1509), (370, 1513), (386, 1540), (382, 1600), (378, 1640), (30, 1640))],
    key=dict(TEX_KEY, band=8), fade=(1636, 18))
add('frites_gaufrette', 3, 'Frites gaufrette',
    [poly((420, 1580), (425, 1542), (450, 1517), (520, 1507), (650, 1505), (720, 1517), (740, 1545), (746, 1590), (740, 1640), (425, 1640))],
    key=dict(TEX_KEY, band=8), fade=(1636, 18))
add('can_coca', 3, 'Canette Coca-Cola cherry',
    [poly((772, 1482), (782, 1463), (830, 1458), (884, 1463), (895, 1482), (897, 1720), (889, 1744), (830, 1750), (779, 1744), (770, 1720))], feather=1.8)
add('can_oasis', 3, 'Canette Oasis tropical (bas en fondu)',
    [poly((905, 1480), (915, 1461), (965, 1454), (1014, 1461), (1023, 1480), (1023, 1692), (905, 1692))], feather=1.8, fade=(1690, 24))
add('can_lipton', 3, 'Canette Lipton pêche (ice tea)',
    [poly((1028, 1490), (1038, 1466), (1090, 1460), (1140, 1468), (1150, 1490), (1150, 1720), (1140, 1744), (1090, 1752), (1053, 1745), (1050, 1700), (1028, 1692))], feather=1.8)
SAUCE_LABEL = {'algerienne': 'Algérienne', 'samourai': 'Samouraï', 'americaine': 'Américaine'}
for name, cx, row in [('brazil', 145, 1), ('toscane', 362, 1), ('cocktail', 586, 1), ('mayonnaise', 804, 1), ('ketchup', 1020, 1),
                      ('tartare', 145, 2), ('algerienne', 364, 2), ('andalouse', 586, 2), ('samourai', 805, 2), ('americaine', 1022, 2)]:
    top, bot = (1889, 1958) if row == 1 else (2061, 2139)
    add(f'sauce_{name}', 3, f'Pot de sauce {SAUCE_LABEL.get(name, name.capitalize())}', [pot(cx, top, bot)], feather=2)

# --- Capture 2 : desserts
add('tiramisu', 2, 'Tiramisu en verrines (Oreo, Bueno, Raffaello, Spéculoos) + garnitures',
    [poly((565, 400), (620, 375), (700, 385), (760, 330), (800, 285), (880, 278), (960, 298), (990, 320), (1005, 395), (1080, 412), (1130, 440), (1168, 470), (1168, 780), (1100, 800), (1060, 830), (950, 852), (800, 856), (700, 852), (560, 842), (470, 832), (400, 782), (378, 720), (378, 620), (420, 572), (520, 560), (560, 520))],
    key=dict(DESSERT_KEY, key2=dict(kind='red', lo=30, hi=80)), despeckle=60,
    solid=[ell(651, 432, 62, 60), ell(446, 606, 58, 28), ell(445, 676, 46, 28)])
MS = {
    'fraisebanane': ('Fraise banane', [(30, 1240), (25, 1200), (60, 1165), (110, 1148), (160, 1143), (192, 1160), (200, 1200), (198, 1260), (194, 1440), (202, 1478), (150, 1500), (60, 1502), (0, 1482), (0, 1400), (28, 1380)]),
    'oreo': ('Oreo', [(200, 1250), (205, 1210), (240, 1168), (300, 1168), (340, 1200), (352, 1250), (347, 1445), (332, 1462), (250, 1466), (205, 1456), (198, 1300)]),
    'bueno': ('Bueno', [(352, 1250), (360, 1215), (390, 1183), (440, 1168), (480, 1178), (500, 1210), (505, 1250), (500, 1450), (455, 1470), (440, 1495), (350, 1495), (345, 1450), (350, 1300)]),
    'speculoos': ('Spéculoos', [(505, 1250), (510, 1210), (540, 1180), (570, 1150), (640, 1133), (690, 1160), (682, 1210), (665, 1250), (660, 1450), (620, 1470), (570, 1500), (470, 1500), (460, 1450), (500, 1440), (502, 1300)]),
    'snickers': ('Snickers', [(668, 1250), (675, 1210), (710, 1178), (760, 1163), (800, 1173), (825, 1203), (835, 1250), (830, 1450), (790, 1470), (700, 1482), (670, 1457), (668, 1300)]),
    'pistache': ('Pistache', [(835, 1250), (845, 1200), (880, 1168), (920, 1158), (965, 1168), (990, 1198), (1000, 1250), (995, 1440), (1010, 1480), (950, 1496), (840, 1496), (822, 1460), (832, 1300)]),
    'raffaello': ('Raffaello', [(1000, 1250), (1005, 1200), (1040, 1148), (1080, 1133), (1120, 1143), (1150, 1178), (1163, 1250), (1159, 1440), (1140, 1490), (1060, 1496), (1010, 1460), (1000, 1300)]),
}
MS_CUP = {'fraisebanane': (35, 195), 'oreo': (202, 345), 'bueno': (352, 500), 'speculoos': (505, 660),
          'snickers': (672, 830), 'pistache': (838, 995), 'raffaello': (1003, 1158)}
for k, (label, pts) in MS.items():
    l, r = MS_CUP[k]
    add(f'milkshake_{k}', 2, f'Milkshake {label}', [poly(*pts)], key=DESSERT_KEY, flavor=label,
        solid=[poly((l + 6, 1264), (r - 6, 1264), (r - 12, 1438), (l + 12, 1438))])
add('crepes', 2, 'Crêpes (Nutella, Spéculoos, Oreo, Bueno)',
    [poly((400, 1718), (480, 1698), (560, 1698), (650, 1688), (720, 1708), (745, 1760), (750, 1830), (740, 1900), (748, 1960), (745, 2030), (720, 2080), (640, 2110), (560, 2126), (490, 2120), (430, 2060), (380, 2010), (355, 1970), (360, 1900), (380, 1840), (392, 1780))],
    key=DESSERT_KEY)
add('gaufre', 2, 'Gaufres (dont gaufre sur bâtonnet)',
    [poly((800, 1890), (880, 1845), (960, 1822), (1000, 1808), (1060, 1782), (1130, 1798), (1162, 1840), (1166, 1950), (1140, 2010), (1060, 2035), (1000, 2060), (960, 2090), (880, 2120), (800, 2160), (782, 2196), (700, 2196), (660, 2172), (700, 2130), (740, 2090), (745, 2020), (770, 1960))],
    cut=[rect(946, 2036, 1172, 2198)], key=dict(kind='g', lo=22, hi=52, fill=True, fillmax=20000), despeckle=60,
    solid=[poly((792, 1990), (830, 1935), (900, 1890), (980, 1850), (1040, 1828), (1080, 1848), (1062, 1900), (980, 1962),
                (900, 2032), (842, 2080), (792, 2082))])

# --- Capture 7 : mojitos (fond carte blanche) + lampadaire
MOJ = {
    'fraise': ('Fraise', [(100, 830), (110, 770), (150, 748), (193, 744), (192, 560), (190, 532), (260, 512), (280, 490), (330, 482), (370, 500), (405, 510), (412, 455), (440, 452), (438, 525), (428, 536), (420, 760), (380, 765), (440, 770), (480, 800), (482, 860), (450, 886), (390, 888), (360, 884), (230, 886), (160, 892), (110, 880)]),
    'violette': ('Violette', [(729, 560), (735, 530), (800, 512), (820, 490), (870, 485), (905, 505), (955, 505), (955, 455), (985, 452), (978, 540), (960, 560), (955, 760), (880, 770), (940, 770), (1050, 790), (1060, 860), (1030, 905), (956, 905), (952, 888), (760, 888), (735, 870), (730, 800)]),
    'original': ('Original', [(95, 1470), (110, 1410), (160, 1395), (198, 1400), (196, 1200), (200, 1170), (260, 1160), (280, 1145), (330, 1140), (360, 1160), (410, 1160), (415, 1112), (440, 1110), (438, 1175), (430, 1190), (428, 1430), (450, 1430), (495, 1470), (500, 1540), (410, 1541), (405, 1532), (215, 1532), (212, 1540), (120, 1542), (96, 1520)]),
    'pasteque': ('Pastèque', [(612, 1500), (640, 1420), (700, 1395), (737, 1390), (735, 1200), (740, 1170), (800, 1160), (820, 1140), (870, 1140), (900, 1160), (960, 1160), (962, 1112), (990, 1110), (980, 1180), (968, 1200), (966, 1385), (1000, 1380), (1060, 1395), (1085, 1450), (1085, 1540), (1060, 1550), (955, 1550), (950, 1534), (760, 1534), (755, 1555), (640, 1558), (612, 1540)]),
    'bubblegum': ('Bubble gum', [(466, 1790), (470, 1760), (520, 1752), (545, 1730), (600, 1728), (640, 1745), (668, 1745), (672, 1712), (700, 1712), (690, 1770), (680, 1790), (675, 2041), (470, 2041)]),
}
MOJ_SOLID = {  # corps du gobelet (glaçons blancs) forcé opaque
    'fraise': [(198, 540), (422, 540), (388, 868), (234, 868)],
    'violette': [(734, 540), (956, 540), (922, 868), (769, 868)],
    'original': [(203, 1188), (423, 1188), (390, 1522), (238, 1522)],
    'pasteque': [(742, 1188), (962, 1188), (929, 1522), (777, 1522)],
    'bubblegum': [(474, 1775), (668, 1775), (641, 2036), (502, 2036)],
}
for k, (label, pts) in MOJ.items():
    add(f'mojito_{k}', 7, f'Mojito {label}', [poly(*pts)], key=MOJITO_KEY, feather=2.2, flavor=label, decontaminate='white',
        solid=[poly(*MOJ_SOLID[k])])
add('lampadaire', 7, 'Lampadaire de rue (lanterne allumée + mât)',
    [poly((566, 546), (592, 543), (602, 560), (630, 585), (641, 600), (641, 700), (621, 721), (615, 800), (597, 811), (595, 1630),
          (563, 1630), (561, 811), (545, 800), (539, 721), (514, 700), (511, 600), (530, 585), (556, 560))], feather=1.8, smooth=1)

# --- Capture 9 : livraison (plateau : boîte, frites, milkshake, sauce)
LIV_KEY = dict(kind='g', lo=52, hi=108, fill=True, fillmax=120000)
add('livraison', 9, 'Plateau livraison : boîte (riz/poulet), frites, milkshake caramel, sauce',
    [poly((20, 1300), (40, 1250), (80, 1100), (122, 970), (160, 872), (210, 858), (440, 895), (611, 935), (655, 962), (722, 1185), (760, 1295), (766, 1500), (750, 1660), (360, 1565), (28, 1452)),
     poly((375, 1612), (470, 1595), (560, 1600), (700, 1640), (764, 1700), (766, 1840), (722, 2034), (653, 2132), (560, 2120), (354, 2034), (319, 1812), (330, 1700)),
     poly((5, 1812), (30, 1760), (83, 1726), (160, 1705), (225, 1706), (280, 1740), (295, 1812), (270, 1905), (200, 1918), (125, 1918), (14, 1898)),
     poly((785, 1562), (800, 1500), (833, 1462), (900, 1440), (972, 1432), (1080, 1400), (1100, 1365), (1170, 1350), (1170, 2120), (972, 2120), (833, 2092), (764, 1951), (750, 1743))],
    cut=[poly((700, 940), (760, 878), (1135, 874), (1135, 1322), (1040, 1322), (1040, 1196), (780, 1190), (735, 1120)),
         rect(112, 954, 149, 977),                                                       # trait de néon rouge
         poly((306, 1664), (382, 1664), (382, 1700), (370, 1722), (358, 1745), (350, 1772), (306, 1772))],  # lettres du logo du plateau
    key=LIV_KEY, feather=2.5, despeckle=900,
    solid=[poly((180, 920), (360, 915), (560, 975), (660, 1050), (690, 1170), (735, 1300), (750, 1450), (745, 1560), (720, 1600),
                (600, 1585), (350, 1530), (130, 1460), (75, 1420), (70, 1360), (110, 1260), (150, 1150), (165, 1000)),
           poly((372, 1720), (430, 1690), (560, 1680), (690, 1690), (732, 1760), (716, 1950), (688, 2082), (560, 2098), (425, 2072), (386, 1900)),
           poly((812, 1560), (842, 1512), (900, 1482), (980, 1462), (1060, 1456), (1166, 1456), (1166, 1720), (1120, 1850), (1085, 2000),
                (1060, 2088), (980, 2098), (840, 2088), (775, 2000), (770, 1850), (800, 1700)),
           poly((30, 1800), (80, 1752), (150, 1730), (215, 1735), (262, 1770), (272, 1830), (250, 1885), (150, 1900), (40, 1880))])


# ----------------------------------------------------------------------------- outils image
def chaikin(pts, it):
    for _ in range(it):
        out = []
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            out += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        pts = out
    return pts

def raster(shapes, W, H, ox, oy, smooth, ss=3):
    im = Image.new('L', (W * ss, H * ss), 0)
    d = ImageDraw.Draw(im)
    for kind, data in shapes:
        if kind == 'poly':
            pts = chaikin(data, smooth) if smooth else data
            d.polygon([((x - ox) * ss, (y - oy) * ss) for x, y in pts], fill=255)
        else:
            cx, cy, rx, ry = data
            d.ellipse([((cx - rx) - ox) * ss, ((cy - ry) - oy) * ss, ((cx + rx) - ox) * ss, ((cy + ry) - oy) * ss], fill=255)
    return np.asarray(im.resize((W, H), Image.BOX), dtype=np.float32) / 255.0

def box_blur(a, r, axis):
    if r <= 0: return a
    r = int(r)
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)

def gblur(a, sigma):
    """Flou ~gaussien (3 boîtes)."""
    if sigma <= 0.3: return a
    r = max(1, int(round(sigma * 0.9)))
    for _ in range(3):
        a = box_blur(box_blur(a, r, 0), r, 1)
    return a

def erode(mask, r):
    b = (mask > 0.5).astype(np.float32)
    return (box_blur(box_blur(b, r, 0), r, 1) > 0.999).astype(np.float32)

def smoothstep(lo, hi, v):
    x = np.clip((v - lo) / max(1e-6, hi - lo), 0, 1)
    return x * x * (3 - 2 * x)

def fill_holes(core, fillmax):
    """Remplit les composantes « trous » (non-cœur non reliées au bord) d'aire <= fillmax."""
    H, W = core.shape
    bg = ~core
    seen = np.zeros_like(core)
    out = core.copy()
    # 1) tout ce qui touche le bord est du fond : parcours en largeur
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if bg[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if bg[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= yy < H and 0 <= xx < W and bg[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; q.append((yy, xx))
    # 2) composantes restantes = trous
    holes = bg & ~seen
    ys, xs = np.nonzero(holes)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]: continue
        comp = [(y0, x0)]; seen[y0, x0] = True; i = 0
        while i < len(comp):
            y, x = comp[i]; i += 1
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < H and 0 <= xx < W and holes[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; comp.append((yy, xx))
        if len(comp) <= fillmax:
            cy, cx = zip(*comp)
            out[list(cy), list(cx)] = True
    return out

def key_value(rgb, kind):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if kind == 'max': return rgb.max(axis=-1)
    if kind == 'lum': return 0.299 * r + 0.587 * g + 0.114 * b
    if kind == 'g': return 0.15 * r + 0.7 * g + 0.15 * b
    if kind == 'white':
        mean = rgb.mean(axis=-1)
        sat = rgb.max(axis=-1) - rgb.min(axis=-1)
        return np.maximum(255 - mean, sat * 1.4)
    if kind == 'red':  # anti-néon : rouge saturé (peinture / néon du menu) → 0 ; chocolat, caramel, biscuit → haut
        mx = rgb.max(axis=-1)
        red = np.clip((r - np.maximum(g, b)) / np.maximum(r, 1.0), 0, 1)
        return 255.0 * (1 - red) * (r >= mx - 1) + 255.0 * (r < mx - 1)
    if kind == 'food':  # aliments chauds/saturés ou très clairs sur fond neutre (ardoise, asphalte)
        mx = rgb.max(axis=-1)
        return 1.5 * (mx - rgb.min(axis=-1)) + 1.5 * np.maximum(0, mx - 170)
    raise ValueError(kind)


def despeckle(A, minarea):
    """Supprime les petites taches isolées (composantes alpha>0.5 d'aire < minarea)."""
    m = A > 0.5
    H, W = m.shape
    seen = np.zeros_like(m)
    keep = np.zeros_like(m)
    ys, xs = np.nonzero(m)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]: continue
        comp = [(y0, x0)]; seen[y0, x0] = True; i = 0
        while i < len(comp):
            y, x = comp[i]; i += 1
            for yy in (y - 1, y, y + 1):
                for xx in (x - 1, x, x + 1):
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; comp.append((yy, xx))
        if len(comp) >= minarea:
            cy, cx = zip(*comp); keep[list(cy), list(cx)] = True
    K = gblur(keep.astype(np.float32), 2.5)
    return A * np.clip(K * 3, 0, 1)


def cut_one(id_, spec, cache):
    n = spec['src']
    if n not in cache:
        cache[n] = np.asarray(Image.open(os.path.join(SRC, f'menu-{n}.png')).convert('RGB'), dtype=np.float32)
    img = cache[n]
    IH, IW = img.shape[:2]
    feather = spec['feather']
    # boîte englobante des formes + marge
    xs, ys = [], []
    for kind, data in spec['shapes']:
        if kind == 'poly':
            xs += [p[0] for p in data]; ys += [p[1] for p in data]
        else:
            cx, cy, rx, ry = data; xs += [cx - rx, cx + rx]; ys += [cy - ry, cy + ry]
    pad = int(feather * 3 + 4)
    x0, y0 = max(0, int(min(xs)) - pad), max(0, int(min(ys)) - pad)
    x1, y1 = min(IW, int(max(xs)) + pad + 1), min(IH, int(max(ys)) + pad + 1)
    W, H = x1 - x0, y1 - y0
    rgb = img[y0:y1, x0:x1].copy()
    # retouches : un titre du menu recouvre le haut du pain → on reconstruit par symétrie
    for pt in spec['extra'].get('patch', []):
        M = gblur(raster([pt['region']], W, H, x0, y0, 0), pt.get('feather', 2.5))[..., None]
        ax, a, b = pt['axis'], pt['a'], pt['b']
        xs_ = np.arange(x0, x1, dtype=np.float32)
        sx = np.clip(np.round(ax + (ax - xs_) * (b - ax) / (ax - a)), 0, IW - 1).astype(int)
        mir = img[y0:y1][:, sx]
        rgb = rgb * (1 - M) + mir * M

    P = raster(spec['shapes'], W, H, x0, y0, spec['smooth'])
    if spec['cut']:
        P = np.clip(P - raster(spec['cut'], W, H, x0, y0, spec['smooth']), 0, 1)
    Ps = gblur(P, feather)
    # le flou ne doit pas dépasser la forme (le bord reste propre) : on garde le min
    Ps = np.minimum(Ps * 1.0, gblur(P, feather * 0.5) * 1.0)
    Ps = np.clip((Ps - 0.02) / 0.98, 0, 1)

    K = np.ones((H, W), np.float32)
    k = spec['key']
    if k:
        v = key_value(rgb, k['kind'])
        K = smoothstep(k['lo'], k['hi'], v).astype(np.float32)
        if k.get('key2'):
            k2 = k['key2']
            K = K * smoothstep(k2['lo'], k2['hi'], key_value(rgb, k2['kind'])).astype(np.float32)
        if spec['extra'].get('solid'):
            K = np.maximum(K, gblur(raster(spec['extra']['solid'], W, H, x0, y0, 1), 2.0))
        if k.get('fill'):
            core = (K > 0.5) & (P > 0.5)
            filled = fill_holes(core, k.get('fillmax', 4000))
            F = gblur(filled.astype(np.float32), 0.8)
            K = np.maximum(K, F)
        if k.get('band'):
            I = smoothstep(0.62, 0.97, gblur(P, k['band'] * 0.5))
            bf = spec['extra'].get('bandFrom')
            if bf:  # au-dessus (dôme du pain, clair sur fond sombre) : la clé seule détoure
                I = I * smoothstep(bf - 6, bf + 6, np.arange(y0, y1, dtype=np.float32)[:, None])
            K = np.maximum(K, I)
    A = np.clip(Ps * K, 0, 1)
    fd = spec['extra'].get('fade')
    if fd:  # fondu doux du bas (là où une étiquette du menu masquait le produit)
        yy = np.arange(y0, y1, dtype=np.float32)[:, None]
        A = A * smoothstep(0, 1, (fd[0] - yy) / fd[1])
    if spec['extra'].get('despeckle'):
        A = despeckle(A, spec['extra']['despeckle'])

    # décontamination des bords (fond blanc des mojitos)
    if spec['extra'].get('decontaminate') == 'white':
        a = np.clip(A, 1e-3, 1)[..., None]
        m = (A > 0.04)[..., None]
        fg = (rgb - (1 - a) * 255.0) / a
        rgb = np.where(m & (a < 0.98), np.clip(fg, 0, 255), rgb)

    # recadrage serré sur l'alpha utile
    nz = np.nonzero(A > 0.012)
    if len(nz[0]) == 0:
        raise RuntimeError(f'{id_}: masque vide')
    m = 3
    ty0, ty1 = max(0, nz[0].min() - m), min(H, nz[0].max() + m + 1)
    tx0, tx1 = max(0, nz[1].min() - m), min(W, nz[1].max() + m + 1)
    A = A[ty0:ty1, tx0:tx1]; rgb = rgb[ty0:ty1, tx0:tx1]
    A[A < 0.012] = 0
    out = np.dstack([np.clip(rgb, 0, 255), A * 255]).round().astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(HERE, f'{id_}.png'), optimize=True)
    h, w = A.shape
    entry = {'file': f'{id_}.png', 'w': int(w), 'h': int(h), 'src': f'menu-{n}', 'label': spec['label'],
             'box': [int(x0 + tx0), int(y0 + ty0), int(w), int(h)]}
    for kk, vv in spec['extra'].items():
        if kk not in ('decontaminate', 'patch', 'solid', 'fade', 'despeckle', 'bandFrom'): entry[kk] = vv
    if spec['extra'].get('fade'): entry['fadeBottom'] = True
    return entry


# Nom EXACT du produit tel qu'écrit dans FACTS.md (à réutiliser tel quel dans la vidéo).
FACT_NAME = {
    'crousty': 'CROUSTY BINKS', 'coca_cherry': 'Coca-Cola cherry',
    'tacos_nuggets': 'NUGGETS', 'tacos_tenders': 'TENDERS', 'tacos_cordonbleu': 'CORDON BLEU',
    'tacos_tandoori': 'POULET MARINÉ TANDOORI', 'sauce_fromagere': 'SAUCE FROMAGÈRE', 'sauces_tacos': 'CHOISIS TA SAUCE',
    'supp_piquante': 'SAUCE PIQUANTE', 'supp_creme': 'SAUCE CRÈME', 'supp_tenders': 'TENDERS',
    'kapsalone': 'KAPSALONE', 'hotdog': 'HOT DOG', 'hotdog_front': 'HOT DOG', 'hotdog_back': 'HOT DOG',
    'texmex_tenders': 'TENDERS', 'texmex_nuggets': 'NUGGETS', 'texmex_wings': 'WINGS', 'texmex_mozza': 'MOZZA STICK',
    'texmex_camembert': 'CROQ CAMEMBERT', 'texmex_jalapenos': 'JALAPENOS CRÈME', 'frites_cheddar': 'FRITES CHEDDAR BACON',
    'frites_gaufrette': 'FRITES GAUFRETTE', 'can_coca': 'Coca-Cola cherry', 'can_oasis': 'Oasis tropical',
    'can_lipton': 'Lipton pêche', 'sauce_brazil': 'Brazil', 'sauce_toscane': 'Toscane', 'sauce_cocktail': 'Cocktail',
    'sauce_mayonnaise': 'Mayonnaise', 'sauce_ketchup': 'Ketchup', 'sauce_tartare': 'Tartare', 'sauce_algerienne': 'Algérienne',
    'sauce_andalouse': 'Andalouse', 'sauce_samourai': 'Samouraï', 'sauce_americaine': 'Américaine', 'tiramisu': 'TIRAMISU',
    'crepes': 'CRÊPES', 'gaufre': 'GAUFRES', 'livraison': 'LIVRAISON PARTOUT',
    'kapsalone_salade': 'salade', 'kapsalone_oignon': 'oignon rouge', 'kapsalone_tomate': 'tomate',
    'kapsalone_cheddar': 'cheddar fondu', 'kapsalone_viande': 'viande', 'kapsalone_frites': 'frites',
}
FACT_NAME.update({f'sandwich_{k}': v for k, v in NAMES.items()})
FACT_NAME.update({f'burger_{k}': v for k, v in NAMES.items()})
FACT_NAME.update({f'milkshake_{k}': v[0] for k, v in MS.items()})
FACT_NAME.update({f'mojito_{k}': v[0] for k, v in MOJ.items()})
FACT_NAME.update({f'hotdog_ing_{i}': n for i, n in enumerate(['KETCHUP MOUTARDE MIEL', 'SAUCISSE DE POULET', 'OIGNON CRISPY',
                                                                'PERSIL EN DÉCORATION', 'CORNICHON'], 1)})


def main():
    only = set(sys.argv[1:])
    man_path = os.path.join(HERE, 'manifest.json')
    manifest = {}
    if only and os.path.exists(man_path):
        manifest = json.load(open(man_path))
    cache = {}
    for id_, spec in S.items():
        if only and id_ not in only: continue
        manifest[id_] = cut_one(id_, spec, cache)
        e = manifest[id_]
        print(f"{id_:24s} {e['w']:4d}×{e['h']:<4d} {e['src']}")
    ordered = {k: manifest[k] for k in S if k in manifest}
    for k, e in ordered.items():
        if k in FACT_NAME: e['name'] = FACT_NAME[k]
    with open(man_path, 'w') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=1)
    print(f'→ {len(ordered)} découpes, manifest.json')


if __name__ == '__main__':
    main()

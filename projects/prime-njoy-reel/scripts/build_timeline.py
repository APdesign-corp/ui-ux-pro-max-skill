#!/usr/bin/env python3
"""
Monte la timeline du Reel AP Design AUTOUR DE LA VOIX OFF.

Lit voice/vo_layout.json (instants mesurés de chaque mot) et écrit src/timeline.json :
  - markers : instant global de chaque mot ("L3.3D", "L4.arrêtent", "L5.AP", "L6.DM"…)
  - scenes  : bornes en secondes réelles (temps local = secondes depuis le début de la scène) ;
              les scènes se synchronisent sur les mots via f.ml("L4.arrêtent")
  - cues    : sound design synchronisé (temps absolus) — un son distinct par transition
  - music   : électro cinématique (pulsation, silence avant le reveal, pad, résolution)

    python3 scripts/build_timeline.py [--layout voice/vo_layout.json] [--hold 1.6]
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--layout', default=os.path.join(ROOT, 'voice', 'vo_layout.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'src', 'timeline.json'))
    ap.add_argument('--hold', type=float, default=1.3, help='CTA propre après la dernière syllabe (s)')
    ap.add_argument('--bpm', type=float, default=118)
    ap.add_argument('--extra-sfx', action='store_true', help='ajoute la couche de SFX supplémentaires')
    a = ap.parse_args()
    lay = json.load(open(a.layout))

    # marqueurs par segment ("L6.Suis") ET par phrase ("L6.Suis") : les scènes visent la phrase
    M = {}
    for L in lay['lines']:
        seenL = {}
        for c in L['chunks']:
            seen = {}
            for w, t in c['words']:
                k = w if w not in seen else f"{w}#{seen[w] + 1}"
                seen[w] = seen.get(w, 0) + 1
                M[f"{c['id']}.{k}"] = t
                kL = w if w not in seenL else f"{w}#{seenL[w] + 1}"
                seenL[w] = seenL.get(w, 0) + 1
                M.setdefault(f"{L['id']}.{kL}", t)
            M[f"{c['id']}.start"] = c['speech'][0]
            M[f"{c['id']}.end"] = c['speech'][1]
        M[f"{L['id']}.start"] = L['chunks'][0]['speech'][0]
        M[f"{L['id']}.end"] = L['chunks'][-1]['speech'][1]
    m = lambda k: M[k]
    r3 = lambda x: round(x, 3)

    # ---------------------------------------------------------------- scènes (temps local = secondes)
    B12 = m('L2.start') - 0.12
    B23 = m('L3.start') - 0.14
    B34 = m('L4.start') - 0.14
    B45 = m('L5.start') - 0.12
    B56 = m('L6.start') - 0.22
    END = m('L6.end') + a.hold
    scenes = []
    for sid, s0, s1 in [('hook', 0, B12), ('unite', B12, B23), ('products', B23, B34),
                        ('offer', B34, B45), ('promise', B45, B56), ('brand', B56, END)]:
        scenes.append({'id': sid, 'start': r3(s0), 'end': r3(s1), 'design': r3(s1 - s0),
                       'pre': 0, 'post': 0.36 if sid != 'brand' else 0, 'anchors': []})

    # ---------------------------------------------------------------- sound design (un son par transition)
    C = []
    cue = lambda t, typ, dur, gain, **kw: C.append({'t': r3(t), 'type': typ, 'dur': r3(dur), 'gain': gain, **kw})
    # 01 accroche
    cue(0.0, 'impact', 1.0, 0.55, tone='soft')
    for i, w in enumerate(['L1a.Internet', 'L1a.télé', 'L1a.mobile']):
        cue(m(w), 'pop', 0.2, 0.5)
        cue(m(w) + 0.03, 'blip', 0.12, 0.25)
    cue(m('L1b.cher') - 0.35, 'riser', 0.35, 0.4)
    cue(m('L1b.cher'), 'hit', 0.9, 0.75)
    cue(m('L1b.cher') + 0.2, 'glass', 0.8, 0.45)                      # l'étiquette se fissure
    cue(B12 - 0.36, 'swish', 0.4, 0.45, pan=[-0.5, 0.5])               # points qui recouvrent
    # 02 réuni (bleu nuit)
    cue(B12, 'sub', 1.2, 0.5)
    cue(B12 + 0.05, 'suck', max(0.4, m('L2.Prime') - B12), 0.35)       # tourbillon de points
    cue(m('L2.Prime'), 'shimmer', 0.8, 0.35)
    cue(m("L2.N'Joy"), 'pop', 0.2, 0.45)
    cue(m('L2.réuni') - 0.3, 'zips', 0.8, 0.3)
    cue(m('L2.réuni') + 0.12, 'impact', 1.6, 0.8)
    cue(B23 - 0.3, 'whoosh', 0.55, 0.55, pan=[0, 0])                   # zoom à travers le logo
    # 03 produits
    cue(m('L3.télé'), 'digital', 0.4, 0.45)
    cue(m('L3.télé') + 0.15, 'hit', 0.7, 0.4)
    cue(m('L3.Internet'), 'transmit', 0.9, 0.4)
    cue(m('L3.Internet') + 0.25, 'click', 0.3, 0.45)
    cue(m('L3.GSM') - 0.1, 'swish', 0.35, 0.4, pan=[0.8, -0.2])
    cue(m('L3.GSM') + 0.3, 'click', 0.3, 0.4)
    cue(B34 - 0.32, 'whoosh', 0.45, 0.6, pan=[-0.8, 0.8])              # balayage en dégradé
    # 04 offre
    cue(B34 + 0.02, 'swish', 0.4, 0.4)
    cue(m('L4a.45') - 0.3, 'ticks', 0.3, 0.35)                         # compteur 86 → 45
    cue(m('L4a.45'), 'impact', 1.4, 0.85, tone='bright')
    cue(m('L4a.45') + 0.02, 'burst', 0.5, 0.4)                         # confettis
    cue(m('L4a.mois') + 0.1, 'pop', 0.2, 0.45)
    cue(m('L4a.45') + 0.08, 'snap', 0.5, 0.4)                          # ancien prix barré
    cue(B45 - 0.2, 'burst', 0.5, 0.6)                                  # éclair
    cue(B45 - 0.12, 'hit', 0.8, 0.6)
    # 05 promesse
    cue(B45 + 0.05, 'shimmer', 0.8, 0.3)
    for w in ['L5.Plus', 'L5.connexion', 'L5.un', 'L5.quotidien']:
        cue(m(w), 'blip', 0.14, 0.3)
    cue(m('L5.quotidien') + 0.3, 'success', 0.9, 0.35)
    cue(B56 - 0.35, 'zips', 0.8, 0.35)                                  # dispersion en points
    # 06 signature
    cue(B56 + 0.02, 'suck', 0.6, 0.35)
    cue(m('L6.Prime'), 'impact', 2.2, 0.85)
    cue(m("L6.N'Joy") + 0.05, 'shimmer', 0.8, 0.35)
    cue(m('L6.Télécom'), 'pop', 0.2, 0.45)
    cue(m('L6.énergie'), 'pulse2', 0.6, 0.45)
    cue(m('L6.Ensemble'), 'glass', 1.0, 0.3)
    cue(m('L6.end') + 0.15, 'impact', 1.4, 0.5, tone='bright')
    C.sort(key=lambda c: c['t'])

    music = {
        'bpm': a.bpm,
        'pulseFrom': r3(B12), 'pulseTo': r3(B56 - 0.05),
        'hatsFrom': r3(B23), 'silenceFrom': r3(B56 - 0.02), 'padFrom': r3(m('L6.Prime')),
        'swellFrom': r3(m('L6.start')), 'resolveAt': r3(m('L6.end') + 0.15),
        'roots': [[0, 49.0], [r3(B12), 43.65], [r3(B23), 49.0], [r3(B34), 55.0], [r3(B45), 46.25], [r3(B56), 49.0]],
    }
    script = json.load(open(os.path.join(ROOT, 'voice', 'script.json')))
    emph = []
    for e in script.get('emphasis', []):
        cid, w = e['word'].split('.', 1)
        for L in lay['lines']:
            for c in L['chunks']:
                if c['id'] != cid and L['id'] != cid:
                    continue
                ws = c['words']
                for i, (ww, tw) in enumerate(ws):
                    if ww.lower() == w.lower():
                        end = ws[i + 1][1] if i + 1 < len(ws) else c['speech'][1] + 0.05
                        emph.append({'word': e['word'], 'from': r3(tw - 0.03), 'to': r3(end), 'db': e['db']})
                        break
    tl = {
        '_doc': "GÉNÉRÉ par scripts/build_timeline.py à partir de voice/vo_layout.json — ne pas éditer à la main. Temps local des scènes = secondes ; synchronisation sur les mots via les markers ; cues = sound design en temps absolu.",
        'duration': r3(END),
        'vo': {'file': 'voice/vo_master.wav', 'dry': 'voice/vo_dry.wav', 'voice': lay['voice'], 'gender': lay['gender'],
               'emphasis': emph},
        'markers': {k: r3(v) for k, v in M.items()},
        'scenes': scenes,
        'music': music,
        'cues': C,
    }
    json.dump(tl, open(a.out, 'w'), indent=1, ensure_ascii=False)
    print(f"timeline : {END:.2f} s · voix {lay['voice']} · {len(C)} cues · scènes " +
          ' | '.join(f"{s['id']} {s['start']:.2f}–{s['end']:.2f}" for s in scenes))


if __name__ == '__main__':
    main()

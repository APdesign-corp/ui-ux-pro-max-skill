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
    ap.add_argument('--hold', type=float, default=1.6, help='CTA propre après la dernière syllabe (s)')
    ap.add_argument('--bpm', type=float, default=120)
    a = ap.parse_args()
    lay = json.load(open(a.layout))

    M = {}
    for L in lay['lines']:
        for c in L['chunks']:
            seen = {}
            for w, t in c['words']:
                k = w if w not in seen else f"{w}#{seen[w] + 1}"
                seen[w] = seen.get(w, 0) + 1
                M[f"{c['id']}.{k}"] = t
            M[f"{c['id']}.start"] = c['speech'][0]
            M[f"{c['id']}.end"] = c['speech'][1]
    m = lambda k: M[k]
    r3 = lambda x: round(x, 3)

    # ---------------------------------------------------------------- scènes
    B12 = m('L2.start') - 0.08           # HOOK → SHOWREEL sur « Alors »
    B23 = m('L3.start') - 0.12           # SHOWREEL → HERO sur « Motion »
    B34 = m('L3.3D') - 0.06              # HERO → 3D / VFX / SCROLL
    B45 = m('L5.start') - 0.42           # noir + silence avant « Ça, c'est AP Design »
    B56 = m('L6.start') - 0.16           # CTA
    END = m('L6.end') + a.hold
    STOP = m('L4.arrêtent')              # arrêt brutal du scroll
    AP = m('L5.AP')
    DM = m('L6.DM')

    scenes = []
    for sid, s0, s1 in [('hook', 0, B12), ('showreel', B12, B23), ('hero', B23, B34),
                        ('kinetic', B34, B45), ('reveal', B45, B56), ('cta', B56, END)]:
        scenes.append({'id': sid, 'start': r3(s0), 'end': r3(s1), 'design': r3(s1 - s0),
                       'pre': 0, 'post': 0.04 if sid != 'cta' else 0, 'anchors': []})

    # ---------------------------------------------------------------- sound design
    C = []
    cue = lambda t, typ, dur, gain, **kw: C.append({'t': r3(t), 'type': typ, 'dur': r3(dur), 'gain': gain, **kw})
    # 01 HOOK — impact d'ouverture (frame 3), sculpture qui fonce vers la caméra
    cue(0.0, 'impact', 1.4, 0.9)
    cue(0.04, 'burst', 0.5, 0.45)
    cue(0.08, 'whoosh', 0.45, 0.55, pan=[0.6, -0.6])
    cue(m('L1.vidéos') - 0.02, 'hit', 0.8, 0.55)                      # « COMME ÇA ? »
    cue(B12 - 0.42, 'riser', 0.42, 0.45)
    cue(B12 - 0.3, 'suck', 0.3, 0.35)
    # 02 SHOWREEL — une coupe = un son (hit / swish / glitch alternés)
    n = 5
    d = (B23 - B12) / n
    for i in range(n):
        t = B12 + i * d
        cue(t, ['hit', 'swish', 'digital', 'whoosh', 'click'][i], 0.45, [0.55, 0.4, 0.4, 0.5, 0.55][i],
            **({'pan': [(-1) ** i * 0.7, -(-1) ** i * 0.7]} if i in (1, 3) else {}))
    cue(m('L2.banal'), 'digital', 0.4, 0.5)                           # « banal » → glitch
    cue(m('L2.banal') + 0.02, 'snap', 0.5, 0.45)
    cue(B23 - 0.36, 'whoosh', 0.4, 0.6, pan=[0, 0])
    # 03 HERO — MOTION DESIGN
    cue(B23, 'impact', 1.4, 0.65, tone='soft')
    cue(m('L3.Motion') + 0.02, 'shimmer', 0.9, 0.3)
    cue(m('L3.design'), 'glass', 0.8, 0.3)
    # 04 3D • VFX • SCROLL
    cue(m('L3.3D'), 'hit', 0.8, 0.7)
    cue(m('L3.3D') + 0.03, 'servo', 0.3, 0.2)
    cue(m('L3.VFX'), 'burst', 0.6, 0.65)
    cue(m('L3.VFX'), 'impact', 1.0, 0.55, tone='bright')
    cue(m('L4.start') - 0.05, 'zips', max(0.6, STOP - m('L4.start') - 0.05), 0.35)   # scroll qui s'emballe
    cue(m('L4.start'), 'riser', max(0.6, STOP - m('L4.start')), 0.5)
    cue(STOP, 'snap', 0.8, 0.95)                                      # ARRÊT BRUTAL sur « arrêtent »
    cue(STOP, 'impact', 1.2, 0.85)
    cue(m('L4.scroll'), 'hit', 0.9, 0.7)
    cue(m('L4.scroll') + 0.03, 'pulse2', 0.6, 0.4)
    cue(B45 - 0.05, 'suck', 0.4, 0.3)
    # 05 REVEAL — noir, silence… flash
    cue(AP - 0.55, 'riser', 0.55, 0.55)
    cue(AP, 'impact', 3.0, 1.0)                                       # « AP » → grand impact (sub-drop)
    cue(AP, 'sub', 1.8, 0.7)
    cue(AP + 0.04, 'shimmer', 1.0, 0.32)
    cue(m('L5.Design'), 'glass', 1.0, 0.3)
    cue(B56 - 0.3, 'whoosh', 0.36, 0.5, pan=[-0.8, 0.8])
    # 06 CTA — + SUIVRE / DM
    cue(m('L6.Suis'), 'pop', 0.2, 0.55)
    cue(m('L6.compte'), 'blip', 0.18, 0.35)
    cue(m('L6.collaborer'), 'ticks', max(0.3, DM - m('L6.collaborer') - 0.1), 0.25)
    cue(DM - 0.3, 'riser', 0.3, 0.4)
    cue(DM, 'impact', 1.6, 0.75, tone='bright')                       # « DM » → bouton + notif
    cue(DM, 'click', 0.4, 0.6)
    cue(DM + 0.28, 'success', 0.9, 0.42)
    cue(DM + 0.3, 'pop', 0.2, 0.4)
    cue(END - 0.32, 'suck', 0.3, 0.35)                                # retour au noir → boucle
    C.sort(key=lambda c: c['t'])

    music = {
        'bpm': a.bpm,
        'pulseFrom': r3(B12), 'pulseTo': r3(B45 - 0.05),
        'hatsFrom': r3(B23), 'silenceFrom': r3(B45), 'padFrom': r3(AP),
        'swellFrom': r3(B56), 'resolveAt': r3(DM),
        'roots': [[0, 41.2], [r3(B12), 43.65], [r3(B23), 41.2], [r3(B34), 49.0], [r3(STOP), 36.71], [r3(B45), 41.2]],
    }
    script = json.load(open(os.path.join(ROOT, 'voice', 'script.json')))
    emph = []
    for e in script.get('emphasis', []):
        cid, w = e['word'].split('.', 1)
        for L in lay['lines']:
            for c in L['chunks']:
                if c['id'] != cid:
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

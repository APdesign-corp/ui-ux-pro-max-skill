#!/usr/bin/env python3
"""
Monte la timeline AUTOUR DE LA VOIX OFF.

Lit voice/vo_layout.json (instants mesurés de chaque mot) et écrit src/timeline.json :
  - markers : instant global de chaque mot ("L2.GSM", "L5.Ria", "L7b.Votre"…)
  - scenes  : bornes + ancres [temps design, temps global] qui recalent les moments
              clés de l'animation sur les mots (explosion = « réparation »,
              scan vert = « expertise », WESTERN UNION = « Western Union »…)
  - cues    : sound design synchronisé (temps absolus), dérivé des mots
  - music   : structure de la musique (pulsation, silence avant le reveal, résolution)

Priorité : VOIX → IMAGE → VFX → SOUND DESIGN → MUSIQUE.

    python3 scripts/build_timeline.py [--layout voice/vo_layout.json]
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--layout', default=os.path.join(ROOT, 'voice', 'vo_layout.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'src', 'timeline.json'))
    ap.add_argument('--hold', type=float, default=1.45, help='image finale propre après la dernière syllabe (s)')
    a = ap.parse_args()
    lay = json.load(open(a.layout))

    # ---------------------------------------------------------------- marqueurs
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
    B12 = m('L2.start') - 0.24          # arrivée des smartphones juste avant « Découvrez »
    B23 = m('L3.start') - 0.22          # push-in dans l'écran → « Téléphonie »
    B34 = m('L4.start') - 0.2
    B45 = m('L5.start') - 0.2
    B56 = m('L5.end') + 0.8             # retour au noir après « …et Ria. » (les noms restent lisibles)
    FINAL_HIT = m('L7b.end') + 0.1      # impact vert final juste après « expertise »
    END = m('L7b.end') + a.hold
    snap = m('L3.et') - 0.06            # réassemblage juste avant « …et expertise »

    scenes = [
        {'id': 'intro', 'start': 0, 'end': B12, 'design': 3, 'pre': 0, 'post': 0.05, 'anchors': [
            [0.6, m('L1.Liège')], [1.0, m('L1.smartphone')], [2.0, m('L1.mieux') + 0.06], [2.72, B12 - 0.3]]},
        {'id': 'phones', 'start': B12, 'end': B23, 'design': 3, 'pre': 0, 'post': 0.05, 'anchors': [
            [0.9, m('L2.GSM') - 0.04], [1.0, m('L2.Center')], [2.55, B23 - 0.3]]},
        {'id': 'repair', 'start': B23, 'end': B34, 'design': 3, 'pre': 0, 'post': 0.05, 'anchors': [
            [0.15, m('L3.Téléphonie') + 0.05], [0.38, m('L3.réparation') - 0.02], [2.0, snap],
            [2.05, m('L3.expertise')], [2.72, B34 - 0.3]]},
        {'id': 'accessories', 'start': B34, 'end': B45, 'design': 3, 'pre': 0, 'post': 0.05, 'anchors': [
            [0.5, m('L4.Internet')], [1.5, m('L4.accessoires')], [2.62, B45 - 0.36]]},
        {'id': 'transfer', 'start': B45, 'end': B56, 'design': 3, 'pre': 0, 'post': 0.05, 'anchors': [
            [0.42, m('L5.transferts')], [2.45, B56 - 0.36]]},
        {'id': 'final', 'start': B56, 'end': END, 'design': 5, 'pre': 0, 'post': 0, 'anchors': [
            [0.9, m('L7a.GSM') - 0.1], [1.0, m('L7a.GSM')], [1.5, m('L7a.Liège')], [1.95, m('L7b.Votre')],
            [3.5, FINAL_HIT]]},
    ]
    for s in scenes:
        s['start'], s['end'] = r3(s['start']), r3(s['end'])
        # ancres strictement croissantes (en design ET en global), sinon ignorées
        keep, last = [], s['start']
        for x, y in s['anchors']:
            if last + 0.02 < y < s['end'] - 0.02:
                keep.append([x, r3(y)])
                last = y
            else:
                print(f"  ! ancre ignorée ({s['id']} {x} -> {y:.3f})")
        s['anchors'] = keep

    def at(scene, local):
        """temps design -> temps global (même interpolation que src/core/anim.js)."""
        s = next(x for x in scenes if x['id'] == scene)
        pts = sorted([[0, s['start']]] + s['anchors'] + [[s['design'], s['end']]])
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if local <= x1 or (x1 == pts[-1][0]):
                return y0 + (local - x0) * (y1 - y0) / ((x1 - x0) or 1e-9)

    # ---------------------------------------------------------------- sound design
    C = []
    cue = lambda t, typ, dur, gain, **kw: C.append({'t': r3(t), 'type': typ, 'dur': r3(dur), 'gain': gain, **kw})
    # 1. INTRO — mystère
    cue(0.0, 'drone', m('L1.mieux'), 0.5)
    cue(m('L1.Liège') - 0.02, 'sub', 1.6, 0.55)                       # « À Liège » → sub très léger
    cue(0.15, 'ticks', max(0.4, m('L1.smartphone') - 0.15), 0.3)
    cue(m('L1.smartphone'), 'digital', 0.5, 0.45)                     # « smartphone » → digital pulse
    cue(m('L1.smartphone') + 0.08, 'shimmer', 0.8, 0.25)
    cue(m('L1.mérite') - 0.1, 'suck', max(0.3, m('L1.mieux') - m('L1.mérite') + 0.1), 0.45)
    cue(m('L1.mieux') + 0.06, 'impact', 1.6, 0.5, tone='soft')        # le logo commence à se former
    cue(B12 - 0.34, 'whoosh', 0.4, 0.6, pan=[-0.8, 0.8])
    # 2. SMARTPHONES — « Découvrez GSM Center »
    cue(B12, 'hit', 0.9, 0.45)
    cue(B12 + 0.35, 'glass', 0.9, 0.22)
    cue(m('L2.GSM'), 'digital', 0.35, 0.35)
    cue(m('L2.Center'), 'impact', 1.8, 0.78)                          # impact cinématique sous « Center »
    cue(at('phones', 1.55), 'swish', 0.45, 0.22, pan=[0.5, -0.5])
    cue(B23 - 0.55, 'riser', 0.55, 0.38)
    cue(B23 - 0.38, 'whoosh', 0.42, 0.62, pan=[0, 0])
    # 3. RÉPARATION — « Téléphonie, réparation… et expertise »
    cue(m('L3.Téléphonie'), 'blip', 0.18, 0.25)
    cue(m('L3.réparation'), 'click', 0.5, 0.75)                       # « réparation » → clic mécanique
    cue(m('L3.réparation') + 0.02, 'burst', 0.55, 0.5)                #   + séparation des composants
    for i, l in enumerate([0.8, 0.9, 1.0]):
        cue(at('repair', l), 'blip', 0.14, 0.22)
    cue(at('repair', 0.85), 'servo', max(0.3, snap - at('repair', 0.85) - 0.1), 0.18)
    cue(snap, 'snap', 0.8, 0.7)
    cue(m('L3.expertise'), 'scan', 0.6, 0.45)                         # « expertise » → scanner
    cue(at('repair', 2.55), 'success', 0.9, 0.35)
    cue(B34 - 0.32, 'whoosh', 0.36, 0.6, pan=[-0.9, 0.9])
    # 4. INTERNET • MULTIMÉDIA • ACCESSOIRES
    cue(B34, 'hit', 0.8, 0.42)
    cue(m('L4.Internet'), 'digital', 0.45, 0.5)                       # « Internet » → digital pulse
    cue(m('L4.Internet') + 0.05, 'data', 0.5, 0.25)
    cue(m('L4.multimédia'), 'hit', 0.8, 0.55)
    cue(m('L4.multimédia') + 0.04, 'pop', 0.2, 0.35)
    cue(m('L4.accessoires'), 'hit', 0.8, 0.6)
    for i in range(3):
        cue(m('L4.accessoires') + 0.06 + i * 0.09, 'pop', 0.18, 0.3)
    cue(B45 - 0.46, 'riser', 0.46, 0.35)
    cue(B45 - 0.36, 'whoosh', 0.42, 0.6, pan=[0, 0])
    # 5. TRANSFERTS — Western Union / Ria
    cue(B45 + 0.04, 'pulse', 1.2, 0.5)
    cue(m('L5.transferts'), 'transmit', max(0.5, m('L5.Western') - m('L5.transferts') + 0.2), 0.45)
    cue(m('L5.transferts') + 0.1, 'zips', 1.4, 0.28)
    cue(m('L5.Western'), 'transmit', 0.7, 0.55)                       # « Western Union » → transmission
    cue(m('L5.Western'), 'hit', 0.9, 0.55)
    cue(m('L5.Ria'), 'pulse2', 0.8, 0.6)                              # « Ria » → second pulse
    cue(B56 - 0.5, 'whoosh', 0.55, 0.62, pan=[0, 0])
    # 6. FINAL — « Tout ce dont vous avez besoin… au même endroit. »
    cue(m('L6.start') - 0.05, 'suck', max(0.6, m('L6.besoin') - m('L6.start') + 0.4), 0.3)
    cue(m('L6.au') - 0.1, 'riser', max(0.6, m('L7a.GSM') - m('L6.au') + 0.1), 0.6)  # « au même endroit » → montée
    cue(m('L7a.GSM'), 'impact', 3.2, 1.0)                             # « GSM Center Liège » → grand impact
    cue(m('L7a.GSM') + 0.05, 'shimmer', 0.9, 0.28)
    cue(at('final', 2.6), 'ticks', 0.45, 0.2)
    cue(FINAL_HIT, 'impact', 1.6, 0.6, tone='bright')                 # résolution finale
    cue(FINAL_HIT, 'glass', 1.4, 0.32)
    C.sort(key=lambda c: c['t'])

    music = {
        'bpm': 120,
        'pulseFrom': r3(B12), 'pulseTo': r3(m('L6.end') + 0.25),
        'hatsFrom': r3(B34), 'silenceFrom': r3(m('L6.end') + 0.3), 'padFrom': r3(m('L7a.GSM')),
        'swellFrom': r3(m('L7b.Votre')), 'resolveAt': r3(FINAL_HIT),
        'roots': [[r3(B12), 55.0], [r3(B23), 43.65], [r3(B34), 49.0], [r3(B45), 41.2], [r3(B56), 46.25]],
    }
    tl = {
        '_doc': "GÉNÉRÉ par scripts/build_timeline.py à partir de voice/vo_layout.json — ne pas éditer à la main. Les scènes sont recalées sur la voix off (ancres [temps design, temps global]) ; cues = sound design en temps absolu.",
        'duration': r3(END),
        'vo': {'file': 'voice/vo_master.wav', 'dry': 'voice/vo_dry.wav', 'voice': lay['voice'], 'gender': lay['gender']},
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

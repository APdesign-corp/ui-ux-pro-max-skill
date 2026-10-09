#!/usr/bin/env python3
"""
Repose la voix off sur la timeline SANS la régénérer : reprend les segments déjà
enregistrés (voice/chunks/*.wav) et applique les silences actuels de voice/script.json
('gap_before' des phrases, 'pause' des segments). Les instants de chaque mot suivent.
Utile pour ajuster la respiration du montage après le choix des prises.

    python3 scripts/voice_relayout.py && python3 scripts/build_timeline.py
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def read(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768


def main():
    vdir = os.path.join(ROOT, 'voice')
    lay = json.load(open(os.path.join(vdir, 'vo_layout.json')))
    script = {L['id']: L for L in json.load(open(os.path.join(vdir, 'script.json')))['lines']}
    t, pieces = 0.0, []
    for L in lay['lines']:
        S = script[L['id']]
        t += S.get('gap_before', 0.4)
        shift_line = t - L['start']
        L['start'] = round(t, 3)
        for c, sc in zip(L['chunks'], S['chunks']):
            x = read(os.path.join(vdir, 'chunks', f"{c['id']}.wav"))
            d = t - c['start']
            c['start'], c['end'] = round(t, 3), round(t + len(x) / SR, 3)
            c['speech'] = [round(v + d, 3) for v in c['speech']]
            c['words'] = [[w, round(tw + d, 3)] for w, tw in c['words']]
            pieces.append((t, x))
            t += len(x) / SR + sc.get('pause', 0)
        L['end'] = L['chunks'][-1]['end']
        _ = shift_line
    lay['vo_end'] = round(t, 3)
    total = np.zeros(int((t + 0.5) * SR))
    for st, x in pieces:
        i = int(st * SR)
        total[i:i + len(x)] += x
    with wave.open(os.path.join(vdir, 'vo_dry.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(total, -1, 1) * 32767).astype('<i2').tobytes())
    json.dump(lay, open(os.path.join(vdir, 'vo_layout.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"voix reposée : {lay['vo_end']:.2f} s")


if __name__ == '__main__':
    main()

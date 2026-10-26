#!/usr/bin/env python3
"""
Ajoute de légères RESPIRATIONS (inspirations) avant chaque phrase de la voix off, comme dans un vrai
enregistrement studio : bruit filtré dans la bande de la voix (300–3500 Hz, deux formants doux),
enveloppe montée/descente, ~ -32 dB sous la voix. À lancer après voice_relayout.py :

    python3 scripts/voice_relayout.py && python3 scripts/add_breaths.py && python3 scripts/build_timeline.py
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def breath(dur, seed):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    band = np.clip((f - 250) / 250, 0, 1) * np.clip((3800 - f) / 1200, 0, 1)
    formants = 1 + 0.8 * np.exp(-((f - 750) / 260) ** 2) + 0.5 * np.exp(-((f - 1600) / 400) ** 2)
    x = np.fft.irfft(X * band * formants, n)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * np.clip(t / 0.45, 0, 1) / 2) ** 2 * np.cos(np.pi * np.clip((t - 0.45) / 0.55, 0, 1) / 2) ** 2
    x *= env
    return x / (np.abs(x).max() + 1e-9)


def main():
    vdir = os.path.join(ROOT, 'voice')
    lay = json.load(open(os.path.join(vdir, 'vo_layout.json')))
    with wave.open(os.path.join(vdir, 'vo_dry.wav')) as w:
        y = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    level = 10 ** (-32 / 20)
    prev_end = 0.0
    added = 0
    for i, L in enumerate(lay['lines']):
        start = L['chunks'][0]['speech'][0]
        room = start - prev_end - 0.06
        if room >= 0.18:
            dur = min(0.34, room)
            b = breath(dur, 11 + i) * level * (0.85 + 0.3 * ((i * 37) % 10) / 10)
            s = int((start - 0.05 - dur) * SR)
            if s >= 0:
                y[s:s + len(b)] += b[: len(y) - s]
                added += 1
        prev_end = L['chunks'][-1]['speech'][1]
    with wave.open(os.path.join(vdir, 'vo_dry.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
    print(f'respirations ajoutées : {added}')


if __name__ == '__main__':
    main()

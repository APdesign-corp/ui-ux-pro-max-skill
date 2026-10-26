#!/usr/bin/env python3
"""Sound design SETÍLA (synthétisé, libre de droits) : musique douce « luxe » (pad + piano, 72 BPM, ré majeur)
+ effets synchronisés sur les cues de la vidéo (out/cues.json) : whoosh, scintillement, logo, pop, frappe, fin.
    python3 scripts/sound_design.py --out out/setila-sound.wav --duration 217.3 --cues out/cues.json
"""
import argparse, json, wave
import numpy as np

SR = 48000
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d, seed): return np.random.default_rng(seed).standard_normal(int(d * SR))
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4); return np.fft.irfft(X * m, len(x))
def env_ad(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------------------------------------------------------- effets
def s_whoosh(d=0.8, seed=1):
    d = max(0.3, d); x = noise(d, seed); t = tt(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    # balayage spectral doux
    out = np.zeros_like(x); N = 4
    for k in range(N):
        a, b = int(len(x) * k / N), int(len(x) * (k + 1) / N)
        out[a:b] = bp(x[a:b], 300 + 900 * k, 1800 + 2600 * k)
    return out * e * 0.6
def s_shimmer(d=1.6, seed=2):
    t = tt(d); r = np.random.default_rng(seed); x = np.zeros_like(t)
    for i in range(9):
        f = mtof(r.choice([86, 88, 90, 93, 95, 97, 98, 100])); st = i * 0.07
        e = np.where(t >= st, np.exp(-(t - st) / 0.5) * np.minimum(1, (t - st) / 0.004 + 1e-9), 0)
        x += np.sin(2 * np.pi * f * t) * e * (0.6 + 0.4 * r.random())
    return x * 0.35
def s_chime(d=1.4, seed=3):
    t = tt(d); f = mtof(93)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * env_ad(len(t), 0.002, 0.45) * 0.5
def s_soft(d=0.5, seed=4):
    t = tt(d); x = bp(noise(d, seed), 800, 5000) * env_ad(len(t), 0.003, 0.05) * 0.5
    return x + np.sin(2 * np.pi * mtof(81) * t) * env_ad(len(t), 0.002, 0.12) * 0.25
def s_pop(d=0.4, seed=5):
    t = tt(d); f = 520 + 900 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.001, 0.06) * 0.8
def s_impact(d=1.2, seed=6):
    t = tt(d); f = 55 + 40 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.004, 0.35) * 0.9 + lp(noise(d, seed), 400) * env_ad(len(t), 0.002, 0.08) * 0.3
def s_logo(d=3.0, seed=7):
    # cloche douce + basse feutrée + scintillement
    t = tt(d); x = np.zeros_like(t)
    for m, g in ((62, 0.5), (69, 0.35), (74, 0.3), (78, 0.22), (81, 0.18)):
        x += np.sin(2 * np.pi * mtof(m) * t) * g * env_ad(len(t), 0.01, 1.4)
    x += np.sin(2 * np.pi * mtof(38) * t) * env_ad(len(t), 0.02, 0.9) * 0.5
    sh = s_shimmer(min(d, 1.6), seed); x[:len(sh)] += sh * 0.7
    return x * 0.6
def s_type(d=0.8, seed=8, cps=18):
    n = int(d * SR); x = np.zeros(n); r = np.random.default_rng(seed)
    for k in range(int(d * cps)):
        i = int(k / cps * SR); c = bp(noise(0.03, seed + k), 2000, 9000) * env_ad(int(0.03 * SR), 0.0005, 0.006) * (0.6 + 0.4 * r.random())
        x[i:i + len(c)] += c[: n - i]
    return x * 0.5
def s_end(d=4.0, seed=9):
    t = tt(d); x = np.zeros_like(t)
    for m, g in ((50, 0.45), (57, 0.35), (62, 0.3), (66, 0.25), (69, 0.22), (73, 0.18), (76, 0.15)):
        x += np.sin(2 * np.pi * mtof(m) * t) * g * env_ad(len(t), 0.03, 1.6)
    return x * 0.5
SFX = dict(whoosh=s_whoosh, shimmer=s_shimmer, chime=s_chime, soft=s_soft, pop=s_pop, impact=s_impact, logo=s_logo, type=s_type, end=s_end)

# ---------------------------------------------------------------- musique
def music(total, quiet_ranges):
    n = int(total * SR); out = np.zeros(n); beat = 60 / 72
    prog = [(50, [62, 66, 69, 73]), (47, [62, 66, 69, 71]), (43, [62, 67, 71, 74]), (45, [61, 64, 69, 71])]  # Dmaj7 Bm7 Gmaj7 A6
    bar = beat * 4; nb = int(total / bar) + 1
    for b in range(nb):
        t0 = b * bar; root, ch = prog[b % 4]
        i0 = int(t0 * SR); seglen = int((bar + 1.5) * SR); t = np.arange(seglen) / SR
        pad = sum(np.sin(2 * np.pi * mtof(m) * t + k) + 0.5 * np.sin(2 * np.pi * mtof(m) * 1.004 * t) for k, m in enumerate(ch))
        pe = np.minimum(1, t / 0.9) * np.minimum(1, np.maximum(0, (bar + 1.5 - t)) / 1.2)
        bass = np.sin(2 * np.pi * mtof(root) * t) * np.minimum(1, t / 0.05) * np.exp(-t / 2.2)
        seg = pad * pe * 0.06 + bass * 0.18
        # arpège « piano » en croches
        for k in range(8):
            m = ch[[0, 1, 2, 3, 2, 1, 3, 2][k]] + 12 * (k % 4 == 3)
            s = int(k * beat / 2 * SR); L = int(1.6 * SR); tk = np.arange(L) / SR; f = mtof(m)
            note = (np.sin(2 * np.pi * f * tk) + 0.3 * np.sin(4 * np.pi * f * tk) + 0.1 * np.sin(6 * np.pi * f * tk)) * np.minimum(1, tk / 0.004) * np.exp(-tk / 0.55)
            seg[s:s + L] += note[: max(0, seglen - s)][: len(seg[s:s + L])] * 0.07
        e = min(n, i0 + seglen); out[i0:e] += seg[: e - i0]
    # nappe plus discrète pendant la lecture des avis
    g = np.ones(n)
    for a, b in quiet_ranges: g[int(a * SR):int(b * SR)] = 0.6
    ramp = int(0.8 * SR); c = np.concatenate([[0], np.cumsum(g)])
    idx = np.clip(np.arange(n) + ramp // 2, 0, n); idx0 = np.clip(idx - ramp, 0, n)
    out *= (c[idx] - c[idx0]) / np.maximum(1, idx - idx0)
    fi, fo = int(1.5 * SR), int(3.0 * SR)
    out[:fi] *= np.linspace(0, 1, fi); out[-fo:] *= np.linspace(1, 0, fo)
    return out

def reverb(x, d=1.8):
    ir = noise(d, 99) * np.exp(-tt(d) / (d / 5)); ir = lp(ir, 6000); ir /= np.abs(ir).sum() / 6
    L = len(x) + len(ir); return np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out'); ap.add_argument('--duration', type=float); ap.add_argument('--cues')
    a = ap.parse_args(); info = json.load(open(a.cues)); total = a.duration or info['duration']; n = int(total * SR)
    sfx = np.zeros(n + SR * 5)
    for c in info['cues']:
        f = SFX.get(c['type'], s_soft); kw = {}
        if 'dur' in c and c['type'] in ('whoosh', 'type'): kw['d'] = float(c['dur'])
        x = f(**kw); x = x / (np.abs(x).max() + 1e-9) * float(c.get('gain', 1.0))
        i = int(c['t'] * SR); sfx[i:i + len(x)] += x[: len(sfx) - i]
    sfx = sfx[:n]; sfx = sfx + reverb(sfx) * 0.25
    quiet = [(s['start'], s['end']) for s in info['segments'] if s['id'].startswith('avis-') or s['id'] == 'mots']
    mus = music(total, quiet); mus = mus + reverb(mus) * 0.3
    mix = mus / (np.abs(mus).max() + 1e-9) * 0.55 + sfx / (np.abs(sfx).max() + 1e-9) * 0.42
    mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix / np.abs(mix).max() * 10 ** (-1.5 / 20)
    st = np.stack([mix, np.roll(mix, int(0.012 * SR)) * 0.96 + mix * 0.04], 1)
    with wave.open(a.out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
    print(f'♪ {a.out} {total:.1f}s {len(info["cues"])} cues')

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Sound design synthétisé (piste temporaire), synchronisé sur src/timeline.json.

Chaque apparition importante a sa correspondance sonore : bass hits, whooshes, impacts,
risers, sons digitaux, pulsations électroniques (120 BPM) qui montent jusqu'au reveal
final. Générée en Python pur (numpy) : aucune banque de sons, aucun droit à gérer.
Pour la diffusion, un sound designer peut remplacer cette piste en suivant la même
cue sheet (out/cue-sheet.md).

    python3 scripts/sound_design.py --out out/gsm-center-liege-sound.wav [--duration 20] [--speed 1]
"""
import argparse
import json
import os
import wave

import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ------------------------------------------------------------------ outils
def n_(d):
    return max(1, int(round(d * SR)))


def tt(d):
    return np.arange(n_(d)) / SR


def noise(d, seed):
    return np.random.default_rng(seed).standard_normal(n_(d))


def fft_filter(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1.0)) ** order)
    if hi:
        m *= 1 / (1 + (f / hi) ** order)
    return np.fft.irfft(X * m, len(x))


def sweep_band(x, f0, f1, width=0.8, curve=None):
    """Passe-bande dont la fréquence centrale glisse de f0 à f1 (STFT, recouvrement)."""
    N, hop = 2048, 512
    win = np.hanning(N)
    out = np.zeros(len(x) + N)
    xp = np.concatenate([x, np.zeros(N)])
    freqs = np.fft.rfftfreq(N, 1 / SR)
    lf = np.log2(np.maximum(freqs, 1.0))
    frames = max(1, (len(x)) // hop)
    for i in range(frames):
        s = i * hop
        p = i / max(1, frames - 1)
        if curve is not None:
            p = curve(p)
        fc = f0 * (f1 / f0) ** p
        mask = np.exp(-0.5 * ((lf - np.log2(fc)) / width) ** 2)
        seg = np.fft.irfft(np.fft.rfft(xp[s:s + N] * win) * mask, N)
        out[s:s + N] += seg * win
    return out[:len(x)] / 1.5


def pan(x, p):
    """p : scalaire ou tableau dans [-1, 1] -> stéréo (loi à puissance constante)."""
    p = np.broadcast_to(np.asarray(p, dtype=float), x.shape)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def reverb_ir(d=1.8, seed=3):
    t = tt(d)
    env = np.exp(-t / (d / 6.0))
    l = noise(d, seed) * env
    r = noise(d, seed + 1) * env
    l = fft_filter(l, lo=150, hi=7000)
    r = fft_filter(r, lo=150, hi=7000)
    return norm(np.stack([l, r], axis=1), 0.12)


def convolve_st(x, ir):
    n = len(x) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    out = np.zeros((n, 2))
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:n]
    return out


def sine_glide(f0, f1, d, k=6.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-k * t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ------------------------------------------------------------------ sons
def s_drone(d, **_):
    t = tt(d)
    base = 0.6 * np.sin(2 * np.pi * 55 * t) + 0.35 * np.sin(2 * np.pi * 82.6 * t + 1) + 0.25 * np.sin(2 * np.pi * 110.4 * t)
    nz = sweep_band(noise(d, 1), 180, 2600, 0.9)
    env = (t / d) ** 1.6
    return pan((base * 0.5 + norm(nz) * 0.5) * env, 0)


def s_ticks(d, seed=5, **_):
    out = np.zeros((n_(d), 2))
    rng = np.random.default_rng(seed)
    count = int(14 * d)
    for i in range(count):
        p = (i / count) ** 0.7
        at = int(p * (n_(d) - 400))
        clk = fft_filter(rng.standard_normal(240), lo=3000) * np.exp(-np.arange(240) / 30)
        out[at:at + 240] += pan(norm(clk) * (0.3 + 0.7 * p), rng.uniform(-0.8, 0.8))
    return out


def s_shimmer(d, seed=7, **_):
    t = tt(d)
    rng = np.random.default_rng(seed)
    x = np.zeros_like(t)
    for _ in range(9):
        f = rng.uniform(2200, 6800)
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(6, 14) * t))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return pan(norm(x) * env, np.sin(2 * np.pi * 0.7 * t) * 0.6)


def s_suck(d, **_):
    t = tt(d)
    nz = sweep_band(noise(d, 11), 300, 6000, 1.0, curve=lambda p: p ** 2)
    rise = sine_glide(80, 400, d, k=-2.0) * 0.4
    env = (t / d) ** 3
    return pan((norm(nz) + rise) * env, 0)


def s_impact(d, tone='dark', **_):
    t = tt(d)
    sub = sine_glide(95, 36, d, k=9) * np.exp(-t / 0.75)
    body = fft_filter(noise(d, 21), hi=900) * np.exp(-t / 0.18)
    crack = fft_filter(noise(d, 22), lo=1800) * np.exp(-t / 0.035)
    x = sub * 1.0 + norm(body) * 0.55 + norm(crack) * 0.35
    if tone == 'soft':
        x = sub * 0.8 + norm(body) * 0.3 + norm(crack) * 0.12
    if tone == 'bright':
        bell = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, dd in [(880, 1.0), (1318.5, 0.8), (2093, 0.6), (3520, 0.35)])
        x = x * 0.7 + norm(bell) * 0.35 * np.minimum(1, t / 0.005)
    x = np.tanh(x * 1.6)
    st = pan(x, 0)
    st[:, 0] += norm(fft_filter(noise(d, 23), hi=3000)) * np.exp(-t / 0.4) * 0.08
    st[:, 1] += norm(fft_filter(noise(d, 24), hi=3000)) * np.exp(-t / 0.4) * 0.08
    return st


def s_hit(d, **_):
    t = tt(d)
    sub = sine_glide(78, 44, d, k=10) * np.exp(-t / 0.38)
    crack = fft_filter(noise(d, 31), lo=900, hi=5000) * np.exp(-t / 0.05)
    return pan(np.tanh((sub + norm(crack) * 0.4) * 1.4), 0)


def s_whoosh(d, pan_=(0, 0), seed=41, **_):
    t = tt(d)
    nz = sweep_band(noise(d, seed), 250, 3200, 0.75, curve=lambda p: np.sin(p * np.pi * 0.85))
    env = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.75) ** 2
    pp = pan_[0] + (pan_[1] - pan_[0]) * (t / d)
    return pan(norm(nz) * env, pp)


def s_swish(d, pan_=(0, 0), **_):
    return s_whoosh(d, pan_, seed=43) * 0.7


def s_blip(d, **_):
    t = tt(d)
    x = sine_glide(1700, 2500, d, k=-3) * np.exp(-t / 0.05) + 0.3 * np.sin(2 * np.pi * 5000 * t) * np.exp(-t / 0.02)
    return pan(x, 0.2)


def s_glass(d, **_):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * 1180 * r * t) * np.exp(-t / dd) for r, a, dd in [(1, 1, 0.9), (2.76, 0.5, 0.5), (5.4, 0.3, 0.3), (8.93, 0.15, 0.2)])
    return pan(norm(x) * np.minimum(1, t / 0.003), np.sin(2 * np.pi * 1.2 * t) * 0.5)


def s_riser(d, **_):
    t = tt(d)
    tone = sine_glide(180, 1400, d, k=-3) * 0.35
    nz = sweep_band(noise(d, 51), 400, 7000, 0.8, curve=lambda p: p ** 1.5)
    env = (t / d) ** 2.2
    return pan((tone + norm(nz) * 0.7) * env, 0)


def s_burst(d, **_):
    t = tt(d)
    rng = np.random.default_rng(61)
    x = noise(d, 62)
    gate = np.repeat(rng.random(int(d * 60) + 1) > 0.45, SR // 60 + 1)[: len(t)]
    crushed = np.round(np.sin(2 * np.pi * 220 * t) * 4) / 4
    y = (fft_filter(x, lo=600) * 0.6 + crushed * 0.4) * gate * np.exp(-t / 0.2)
    return pan(norm(y), rng.uniform(-0.3, 0.3))


def s_servo(d, **_):
    t = tt(d)
    f = 140 + 30 * np.sin(2 * np.pi * 3 * t)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    y = fft_filter(saw, hi=900) * np.sin(np.pi * np.clip(t / d, 0, 1))
    return pan(norm(y) * 0.6, -0.2)


def s_snap(d, **_):
    t = tt(d)
    click = fft_filter(noise(d, 71), lo=2500) * np.exp(-t / 0.012)
    metal = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, dd in [(523, 0.25), (1407, 0.18), (2611, 0.12), (4190, 0.08)])
    thump = sine_glide(120, 50, d, k=12) * np.exp(-t / 0.2)
    return pan(np.tanh(norm(click) * 0.6 + norm(metal) * 0.4 + thump), 0)


def s_scan(d, **_):
    t = tt(d)
    x = sine_glide(600, 2400, d, k=-1) * (0.6 + 0.4 * np.sin(2 * np.pi * 32 * t))
    env = np.sin(np.pi * np.clip(t / d, 0, 1))
    return pan(x * env * 0.6, np.linspace(-0.4, 0.4, len(t)))


def s_success(d, **_):
    t = tt(d)
    a = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t / 0.35)
    b_t = np.clip(t - 0.09, 0, None)
    b = np.sin(2 * np.pi * 1975.5 * b_t) * np.exp(-b_t / 0.45) * (t > 0.09)
    return pan(norm(a + b) * 0.8, 0.1)


def s_pop(d, **_):
    t = tt(d)
    return pan(sine_glide(320, 640, d, k=-4) * np.exp(-t / 0.04), 0.0)


def s_data(d, **_):
    out = np.zeros((n_(d), 2))
    rng = np.random.default_rng(81)
    step = 1 / 24
    for i in range(int(d / step)):
        f = rng.choice([1600, 2000, 2400, 3000])
        seg = np.sin(2 * np.pi * f * tt(0.025)) * np.exp(-tt(0.025) / 0.01)
        at = n_(i * step)
        out[at:at + len(seg)] += pan(seg, rng.uniform(-0.6, 0.6))[: len(out) - at]
    return out


def s_pulse(d, **_):
    t = tt(d)
    x = np.sin(2 * np.pi * 45 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2 * t - np.pi / 2)) * np.exp(-t / (d * 0.6))
    return pan(x, 0)


def s_zips(d, **_):
    out = np.zeros((n_(d), 2))
    rng = np.random.default_rng(91)
    for i in range(10):
        at = n_(i * d / 10 + rng.uniform(0, 0.05))
        z = sine_glide(700, 3200, 0.14, k=-2) * np.exp(-tt(0.14) / 0.06)
        out[at:at + len(z)] += pan(z, rng.uniform(-0.8, 0.8))[: len(out) - at]
    return out


def s_sub(d, **_):
    t = tt(d)
    x = np.sin(2 * np.pi * 38 * t + 2 * np.sin(2 * np.pi * 0.5 * t)) * np.minimum(1, t / 0.25) * np.exp(-t / (d * 0.5))
    return pan(x, 0)


def s_digital(d, **_):
    t = tt(d)
    x = np.sign(np.sin(2 * np.pi * 880 * t)) * 0.3 + np.sin(2 * np.pi * 1760 * t) * 0.5
    x = fft_filter(x, lo=500, hi=6000) * np.exp(-t / 0.09) * (1 + 0.6 * np.sin(2 * np.pi * 40 * t))
    sub = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.12) * 0.6
    return pan(norm(x) * 0.7 + sub, 0.15)


def s_click(d, **_):
    t = tt(d)
    c1 = fft_filter(noise(d, 301), lo=1800, hi=9000) * np.exp(-t / 0.006)
    t2 = np.clip(t - 0.045, 0, None)
    c2 = fft_filter(noise(d, 302), lo=1200, hi=7000) * np.exp(-t2 / 0.008) * (t > 0.045)
    body = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, dd in [(1890, 0.03), (3150, 0.02), (640, 0.05)])
    return pan(np.tanh(norm(c1) * 0.9 + norm(c2) * 0.6 + norm(body) * 0.4), -0.1)


def s_transmit(d, **_):
    t = tt(d)
    car = np.sin(2 * np.pi * (1200 + 900 * np.sin(2 * np.pi * 7 * t)) * t)
    gate = (np.sin(2 * np.pi * 18 * t) > 0).astype(float)
    sweep = sine_glide(400, 2600, d, k=-1.5) * 0.4
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8
    x = fft_filter(car * gate * 0.5 + sweep, lo=300, hi=7000) * env
    return pan(norm(x), np.linspace(-0.6, 0.7, len(t)))


def s_pulse2(d, **_):
    t = tt(d)
    x = sine_glide(110, 52, d, k=10) * np.exp(-t / 0.3) + 0.35 * np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t / 0.12)
    return pan(np.tanh(x * 1.3), 0.1)


SOUNDS = {
    'drone': s_drone, 'ticks': s_ticks, 'shimmer': s_shimmer, 'suck': s_suck, 'impact': s_impact,
    'hit': s_hit, 'whoosh': s_whoosh, 'swish': s_swish, 'blip': s_blip, 'glass': s_glass, 'riser': s_riser,
    'burst': s_burst, 'servo': s_servo, 'snap': s_snap, 'scan': s_scan, 'success': s_success, 'pop': s_pop,
    'data': s_data, 'pulse': s_pulse, 'zips': s_zips, 'sub': s_sub, 'digital': s_digital, 'click': s_click,
    'transmit': s_transmit, 'pulse2': s_pulse2,
}
WET = {'click': 0.15, 'pulse2': 0.25, 'impact': 0.35, 'hit': 0.25, 'snap': 0.3, 'glass': 0.4, 'success': 0.45, 'shimmer': 0.3, 'blip': 0.2}

DESCR = {
    'drone': 'nappe grave qui monte dans le noir', 'ticks': 'clics digitaux (apparition des particules)',
    'shimmer': 'scintillement digital (tracés lumineux)', 'suck': 'aspiration inversée (convergence)',
    'impact': 'impact grave + transitoire', 'hit': 'bass hit', 'whoosh': 'whoosh (whip pan / transition)',
    'swish': 'swish léger (rack focus)', 'blip': 'blip UI', 'glass': 'tintement verre / reflet',
    'riser': 'riser (montée)', 'burst': 'éclat glitch (explosion des composants)', 'servo': 'servo / analyse',
    'snap': 'snap métallique (réassemblage)', 'scan': 'balayage scanner', 'success': 'validation (réparé)',
    'pop': 'pop (apparition produit)', 'data': 'flux de données (internet)', 'pulse': 'pulsation sub (carte)',
    'zips': 'zips (arcs de transfert)', 'sub': 'sub bass très léger', 'digital': 'pulse digital',
    'click': 'clic mécanique', 'transmit': 'effet de transmission', 'pulse2': 'second pulse',
}


def music_bed(total, mu, speed=1.0):
    """Musique électronique minimale : pulsation 120 BPM qui monte, basse sidechainée,
    hats, silence avant le reveal, nappe F → G (montée) → résolution La mineur add9."""
    out = np.zeros((n_(total), 2))
    beat = 60.0 / mu['bpm'] / speed
    p0, p1 = mu['pulseFrom'] / speed, mu['pulseTo'] / speed
    h0 = mu['hatsFrom'] / speed
    kicks = []
    t = p0
    while t < p1 - 1e-6:
        kicks.append(t)
        t += beat
    for i, k in enumerate(kicks):
        g = 0.3 + 0.32 * (k - p0) / max(1e-6, p1 - p0)
        kd = 0.35
        kick = sine_glide(130, 46, kd, k=14) * np.exp(-tt(kd) / 0.16)
        at = n_(k)
        out[at:at + len(kick)] += pan(kick * g, 0)[: len(out) - at]
        if k >= h0:
            hd = 0.05
            hat = fft_filter(noise(hd, 200 + i), lo=7000) * np.exp(-tt(hd) / 0.012)
            at2 = n_(k + beat / 2)
            if at2 < len(out):
                out[at2:at2 + len(hat)] += pan(norm(hat) * 0.12, 0.3 * (1 if i % 2 else -1))[: len(out) - at2]
    t_all = np.arange(len(out)) / SR
    roots = [(a / speed, f) for a, f in mu['roots']]
    bass = np.zeros(len(out))
    for j, (a, f) in enumerate(roots):
        b = roots[j + 1][0] if j + 1 < len(roots) else p1
        m = (t_all >= a) & (t_all < min(b, p1))
        ph = 2 * np.pi * f * t_all[m]
        bass[m] = np.tanh(1.5 * (np.sin(ph) + 0.3 * np.sin(2 * ph)))
    duck = np.ones(len(out))
    for k in kicks:
        a = n_(k)
        L = n_(beat)
        duck[a:a + L] = np.minimum(duck[a:a + L], 1 - 0.85 * np.exp(-np.arange(min(L, len(duck) - a)) / (SR * 0.09)))
    fade_b = np.clip((p1 - t_all) / 0.25, 0, 1)
    out += pan(fft_filter(bass, hi=240) * duck * 0.22 * fade_b, 0)
    # silence avant le reveal (seuls les effets parlent), puis nappe
    sil = mu['silenceFrom'] / speed
    out[n_(sil):n_(mu['padFrom'] / speed)] *= np.linspace(1, 0, n_(mu['padFrom'] / speed) - n_(sil))[:, None] ** 2
    pa, sw, rs = mu['padFrom'] / speed, mu['swellFrom'] / speed, mu['resolveAt'] / speed

    def chord(freqs, a, b, amp, att=0.6, rel=0.8):
        m = (t_all >= a) & (t_all < b + rel)
        tp = t_all[m] - a
        x = sum(np.sin(2 * np.pi * f * tp + i * 1.3) + 0.25 * np.sin(4 * np.pi * f * tp + i) for i, f in enumerate(freqs))
        env = np.minimum(1, tp / att) * np.clip((b + rel - t_all[m]) / rel, 0, 1)
        y = np.zeros(len(out))
        y[m] = x * env * amp
        return y

    pad = chord([87.3, 174.6, 220.0, 261.6, 329.6], pa, sw, 0.05, att=0.4)                 # Fa maj7
    pad += chord([98.0, 196.0, 246.9, 293.7, 392.0, 440.0], sw, rs, 0.06, att=0.5, rel=0.25)  # Sol (montée)
    rising = np.clip((t_all - sw) / max(0.1, rs - sw), 0, 1) * ((t_all >= sw) & (t_all < rs))
    pad *= 1 + 0.8 * rising
    pad += chord([110.0, 220.0, 261.6, 329.6, 493.9, 659.3], rs, total - 0.9, 0.075, att=0.05, rel=0.9)  # La m add9 (résolution)
    pad = fft_filter(pad, hi=3200)
    out[:, 0] += pad
    out[:, 1] += np.roll(pad, 240)
    return out


# ------------------------------------------------------------------ voix off
def read_wav_mono(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(1)
    if sr != SR:
        n = int(round(len(x) * SR / sr))
        X = np.fft.rfft(x)
        Y = np.zeros(n // 2 + 1, dtype=complex)
        k = min(len(X), len(Y))
        Y[:k] = X[:k]
        x = np.fft.irfft(Y, n) * (n / len(x))
    return x


def eq_curve(f):
    """EQ voix : coupe-bas, médiums allégés, présence, air (gains en dB)."""
    lf = np.log2(np.maximum(f, 1.0))
    bell = lambda fc, g, bw: g * np.exp(-0.5 * ((lf - np.log2(fc)) / bw) ** 2)
    db = bell(140, 1.5, 0.45) + bell(300, -2.2, 0.5) + bell(3400, 2.8, 0.7) + bell(6800, -1.2, 0.35)
    db += 1.8 / (1 + np.exp(-(lf - np.log2(10000)) * 4))           # air (shelf)
    db += -24 * (1 / (1 + (np.maximum(f, 1) / 75) ** 4))            # passe-haut ~75 Hz
    return 10 ** (db / 20)


def deesser(x, lo=5200, hi=9500, max_red_db=6.0):
    N, hop = 1024, 256
    win = np.hanning(N)
    out = np.zeros(len(x) + N)
    xp = np.concatenate([x, np.zeros(N)])
    f = np.fft.rfftfreq(N, 1 / SR)
    band = (f >= lo) & (f <= hi)
    for i in range(0, len(x), hop):
        F = np.fft.rfft(xp[i:i + N] * win)
        e_b = np.sum(np.abs(F[band]) ** 2)
        e_t = np.sum(np.abs(F) ** 2) + 1e-12
        ratio = e_b / e_t
        red = np.clip((ratio - 0.18) / 0.3, 0, 1) * max_red_db
        F[band] *= 10 ** (-red / 20)
        out[i:i + N] += np.fft.irfft(F, N) * win
    return out[:len(x)] / 1.5


def compressor(x, thr_db=-20, ratio=3.0, att=0.005, rel=0.09, knee=6):
    hop = int(0.001 * SR)
    n = len(x) // hop + 1
    rms = np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop + hop * 4] ** 2) if i * hop < len(x) else 0 for i in range(n)]) + 1e-12)
    lv = 20 * np.log10(rms + 1e-12)
    over = lv - thr_db
    gr = np.where(over <= -knee / 2, 0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio), (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    g = np.zeros(n)
    a_c, r_c = np.exp(-0.001 / att), np.exp(-0.001 / rel)
    cur = 0.0
    for i in range(n):
        c = a_c if gr[i] > cur else r_c
        cur = c * cur + (1 - c) * gr[i]
        g[i] = cur
    gain = 10 ** (-np.interp(np.arange(len(x)) / hop, np.arange(n), g) / 20)
    return x * gain


def process_vo(x, emphasis=()):
    """Chaîne studio : EQ, de-esser, compression légère, accentuation des mots, saturation douce, réverbe courte."""
    X = np.fft.rfft(x)
    x = np.fft.irfft(X * eq_curve(np.fft.rfftfreq(len(x), 1 / SR)), len(x))
    x = deesser(x)
    x = compressor(x, thr_db=-21, ratio=3.0)
    if emphasis:
        g = np.zeros(len(x))
        t = np.arange(len(x)) / SR
        for e in emphasis:
            ramp = np.clip(np.minimum((t - e['from']) / 0.025, (e['to'] - t) / 0.025), 0, 1)
            g = np.maximum(g, ramp * e['db'])
        x = x * 10 ** (g / 20)
    x = norm(x, 0.7)
    x = np.tanh(x * 1.15) / np.tanh(1.15)
    st = pan(x, 0)
    ir_d = 0.32                                                       # petite pièce traitée, pas une cathédrale
    ir = np.stack([noise(ir_d, 501), noise(ir_d, 502)], 1) * np.exp(-tt(ir_d) / 0.06)[:, None]
    ir = np.stack([fft_filter(ir[:, 0], lo=300, hi=6000), fft_filter(ir[:, 1], lo=300, hi=6000)], 1)
    ir = ir / np.max(np.abs(ir)) * 0.05
    wet = convolve_st(st, ir)[: len(st)]
    return st + wet * 0.5


def vo_envelope(vo_mono, att=0.03, rel=0.32):
    hop = int(0.005 * SR)
    n = len(vo_mono) // hop + 1
    lv = np.array([np.sqrt(np.mean(vo_mono[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(vo_mono) else 0 for i in range(n)])
    gate = np.clip((20 * np.log10(lv + 1e-9) + 42) / 14, 0, 1)        # 1 = parole, 0 = silence
    e = np.zeros(n)
    a_c, r_c = np.exp(-0.005 / att), np.exp(-0.005 / rel)
    cur = 0.0
    for i in range(n):
        c = a_c if gate[i] > cur else r_c
        cur = c * cur + (1 - c) * gate[i]
        e[i] = cur
    return np.interp(np.arange(len(vo_mono)) / hop, np.arange(n), e)


def write_st(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def music_portails(total, bpm=120, plan=None):
    """Trailer tech 120 BPM : intro (drone), drop à 2 s, montée, breakdown 14-15.5 s, section dense 18-22 s,
    ampleur 22-26 s, impact 26 s puis nappe résolue, extinction 29.5-30 s (boucle)."""
    N = n_(total)
    out = np.zeros((N, 2))
    beat = 60.0 / bpm
    t = np.arange(N) / SR

    def add(x, at, g=1.0, p=0.0):
        i = n_(at)
        if i >= N:
            return
        x = x[: N - i]
        if x.ndim == 1:
            x = pan(x, p)
        out[i:i + len(x)] += x * g

    def kick():
        d = 0.42
        tt_ = tt(d)
        body = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-tt_ * 28)) / SR) * np.exp(-tt_ * 7)
        click = fft_filter(noise(0.01, 3), lo=1500) * 0.3
        body[: len(click)] += click
        return body

    def hat(seed):
        d = 0.06
        return fft_filter(noise(d, seed), lo=7000) * np.exp(-tt(d) * 70)

    def bass(f, d):
        tt_ = tt(d)
        x = np.sin(2 * np.pi * f * tt_) + 0.4 * np.sin(2 * np.pi * 2 * f * tt_ + 0.5) + 0.2 * np.sign(np.sin(2 * np.pi * f * tt_))
        return fft_filter(x, hi=420) * np.minimum(1, tt_ * 80) * np.exp(-tt_ * 3.5)

    def pad(freqs, d, bright=1200):
        tt_ = tt(d)
        x = sum(np.sin(2 * np.pi * f * tt_ + k) + 0.5 * np.sin(2 * np.pi * f * 1.003 * tt_ + 2 * k) for k, f in enumerate(freqs))
        x = fft_filter(x, hi=bright)
        env = np.minimum(1, tt_ / 0.6) * np.minimum(1, (d - tt_) / 0.6)
        return x * env

    # sections : (début, fin, kick, hats, bass, intensité)
    roots = [55.0, 55.0, 43.65, 49.0]  # La, La, Fa, Sol (A1, F1, G1)
    sections = [(2.0, 14.0, True, True, True), (15.5, 18.0, True, True, True), (18.0, 22.0, True, True, True), (22.0, 25.5, True, False, True)]
    PL = dict(pad_end=26.0, brk=14.0, fin=26.0)
    if plan:
        sections = plan['sections']; PL.update(plan)
    for (a, b, K, Hh, B) in sections:
        nb = int(round((b - a) / beat))
        for i in range(nb):
            at = a + i * beat
            bar = int((at - 2.0) // 2) % 4
            inten = 0.7 + 0.3 * min(1, (at - 2) / 12) if at < 14 else 1.0
            if K:
                add(kick(), at, 0.95 * inten)
            if B:
                add(bass(roots[bar], beat * 0.95), at + beat * 0.5, 0.55 * inten)
                if 18 <= at < 22:
                    add(bass(roots[bar] * 2, beat * 0.45), at + beat * 0.25, 0.25)
            if Hh:
                add(hat(i), at + beat * 0.5, 0.35 * inten, 0.3)
                if at >= 8:
                    add(hat(i + 99), at + beat * 0.25, 0.18, -0.3)
                    add(hat(i + 199), at + beat * 0.75, 0.18, -0.3)
    # nappes
    chords = {55.0: [220, 261.6, 329.6], 43.65: [174.6, 220, 261.6], 49.0: [196, 246.9, 293.7]}
    for k in range(64):
        at = 2.0 + k * 2.0
        if at >= PL['pad_end']:
            break
        r = roots[k % 4]
        add(pan(pad(chords[r], 2.2, 900 if at < 14 else 1600), 0), at, 0.10)
    # intro : drone qui monte
    add(s_drone(2.0), 0.0, 0.5)
    # breakdown 14-15.5 : sous-grave + pad filtré
    add(pan(pad([110, 164.8, 220], 1.8, 600), 0), PL['brk'], 0.18)
    # final : nappe résolue La mineur add9 + petit motif doux
    add(pan(pad([220, 246.9, 261.6, 329.6, 440], 3.6 if not plan else total - PL['fin'], 2200), 0), PL['fin'], 0.16)
    for j, f in enumerate([659.3, 523.3, 493.9, 440.0]):
        d = 0.9
        x = np.sin(2 * np.pi * f * tt(d)) * np.exp(-tt(d) * 3.5)
        add(x, PL['fin'] + 0.6 + j * 0.5, 0.12, 0.2 * (j % 2 * 2 - 1))
    # extinction finale (raccord boucle)
    fo = n_(0.5)
    out[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    return out


ALIASES = {
    'boom': ['impact', 'sub'], 'whip': ['swish'], 'zap': ['burst', 'digital'], 'reverse': ['__reverse'],
    'type': ['ticks'], 'tick': ['ticks'], 'glitch': ['digital'], 'flash': ['shimmer'], 'drop': ['impact'],
    'slam': ['hit', 'snap'], 'riser': ['riser'], 'suck': ['suck'],
}


def render_cue(c):
    ty = c.get('type', 'whoosh')
    d = float(c.get('dur', 0.5))
    names = ALIASES.get(ty, [ty])
    acc = None
    for nm in names:
        if nm == '__reverse':
            x = SOUNDS['whoosh'](max(0.2, d))[::-1].copy()
            x = x + SOUNDS['riser'](max(0.2, d))[: len(x)] * 0.5
        elif nm in SOUNDS:
            dd = d if nm in ('whoosh', 'riser', 'suck', 'data', 'ticks', 'sub', 'drone', 'shimmer') else {'swish': 0.18, 'burst': 0.5, 'digital': 0.25}.get(nm, 0.6)
            x = SOUNDS[nm](dd)
        else:
            x = SOUNDS['whoosh'](0.3)
        if x.ndim == 1:
            x = pan(x, float(c.get('pan', 0)))
        x = x / (np.max(np.abs(x)) or 1)
        acc = x if acc is None else np.pad(acc, ((0, max(0, len(x) - len(acc))), (0, 0)))[: max(len(acc), len(x))] + np.pad(x, ((0, max(0, len(acc) - len(x))), (0, 0)))
    # riser / suck : le PIC est à t + dur → on décale le début
    offset = 0.0
    return acc, offset


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'out', 'gsm-center-portails-sound.wav'))
    ap.add_argument('--duration', type=float, default=30.0)
    ap.add_argument('--cues', default=os.path.join(ROOT, 'out', 'cues.json'))
    a = ap.parse_args()
    total = a.duration
    info = json.load(open(a.cues))
    N = n_(total)
    dry = np.zeros((N + SR * 4, 2))
    wet = np.zeros_like(dry)
    sheet = []
    for c in info['cues']:
        at = float(c['t'])
        if at >= total:
            continue
        snd, _ = render_cue(c)
        g = float(c.get('gain', 1.0))
        i = n_(at)
        dry[i:i + len(snd)] += snd[: len(dry) - i] * g
        wet[i:i + len(snd)] += snd[: len(dry) - i] * g * WET.get(c['type'], 0.15)
        sheet.append((at, c.get('seg', ''), c['type'], g))
    sfx = (dry + convolve_st(wet, reverb_ir(1.2))[: len(dry)])[:N]
    # O'BINKS (48 s) : groove 3 → 18.6 s, souffle (fumée), groove 19 → 44.9 s, logo 45.2 s
    plan = dict(sections=[(3.0, 18.5, True, True, True), (19.0, 40.0, True, True, True), (40.0, 44.9, True, False, True)], pad_end=44.0, brk=18.5, fin=45.2) if total > 35 else None
    music = music_portails(total, plan=plan)
    mix = norm(sfx) * 0.55 + norm(music) * 0.42
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix = mix / (np.max(np.abs(mix)) or 1) * (10 ** (-1 / 20))
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    write_st(a.out, mix)
    sheet.sort()
    md = ['# Cue sheet — GSM Center Liège « Portails »', '', f'Durée {total:.2f} s · 120 BPM · musique et bruitages synthétisés (libres de droits).',
          'Pour mettre votre propre musique : remplacez la piste musique (120 BPM, drop à 2 s, breakdown 14-15,5 s, impact final à 26 s).', '',
          '| Temps (s) | Segment | Son | Gain |', '|---:|---|---|---:|']
    md += [f'| {t:6.2f} | {sg} | {ty} | {g:.2f} |' for t, sg, ty, g in sheet]
    with open(os.path.join(os.path.dirname(a.out), 'cue-sheet.md'), 'w') as f:
        f.write('\n'.join(md) + '\n')
    print(f'♪ {a.out} ({total:.1f} s, {len(sheet)} cues)')


if __name__ == '__main__':
    main()

"""Musique XAU PRÉCISION : instru trap sombre et élégante, 140 BPM, La mineur harmonique.
808 glissées, clap en demi-temps, charleston avec roulements, mélodie « cloche » feutrée, nappe
sous compression latérale. Intro atmosphérique → drop à 3.5 s → coupure 23.4-24.0 s (preuve) →
reprise → fin 40.5 s (nappe + cloche, extinction). Tout est synthétisé (libre de droits)."""
import numpy as np

SR = 48000
def n_(d): return int(round(d * SR))
def tt(d): return np.arange(n_(d)) / SR
def noise(d, seed): return np.random.default_rng(seed).standard_normal(n_(d))
def bp(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m /= (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

BPM = 140
BEAT = 60 / BPM
STEP = BEAT / 2           # croche
BAR = BEAT * 4
# Am – F – Dm – E (La mineur harmonique)
CHORDS = [(45, [57, 60, 64]), (41, [53, 57, 60]), (38, [50, 53, 57]), (40, [52, 56, 59])]
MEL = [[69, 72, 76, 72, 81, 76, 72, 76], [65, 69, 72, 69, 77, 72, 69, 72], [62, 65, 69, 65, 74, 69, 65, 69], [64, 68, 71, 68, 76, 71, 68, 71]]


def s808(f, d):
    t = tt(d)
    fr = f * (1 + 1.0 * np.exp(-t / 0.03))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR)
    env = np.minimum(1, t / 0.003) * np.exp(-t / 0.9)
    return np.tanh(2.2 * x * env) * 0.9

def kick():
    t = tt(0.35)
    fr = 50 + 140 * np.exp(-t / 0.025)
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.12)
    x[: n_(0.004)] += bp(noise(0.004, 2), lo=2000) * 0.4
    return np.tanh(1.6 * x)

def clap(seed=3):
    d = 0.35; x = np.zeros(n_(d))
    for k, o in enumerate([0, 0.011, 0.023]):
        b = bp(noise(0.03, seed + k), lo=900, hi=4200) * np.exp(-tt(0.03) / 0.008)
        i = n_(o); x[i:i + len(b)] += b
    tail = bp(noise(d, seed + 9), lo=800, hi=5000) * np.exp(-tt(d) / 0.09) * 0.5
    return (x + tail) * 0.8

def hat(seed, open_=False):
    d = 0.18 if open_ else 0.05
    return bp(noise(d, seed), lo=7000) * np.exp(-tt(d) / (0.06 if open_ else 0.012)) * 0.5

def bell(m, d=1.6):
    t = tt(d); f = mtof(m)
    I = 1.8 * np.exp(-t / 0.25)
    x = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t))
    return x * np.minimum(1, t / 0.004) * np.exp(-t / 0.7) * 0.5

def pad(notes, d):
    t = tt(d); x = np.zeros_like(t)
    for k, m in enumerate(notes):
        f = mtof(m)
        for det in (-0.004, 0.004):
            for h, a in ((1, 1), (2, 0.35), (3, 0.18)):
                x += a * np.sin(2 * np.pi * f * h * (1 + det) * t + k)
    x = bp(x, hi=1600)
    env = np.minimum(1, t / 0.5) * np.minimum(1, np.maximum(0, d - t) / 0.5)
    return x * env * 0.12

def reverse_swell(d, seed=5):
    t = tt(d)
    return bp(noise(d, seed), lo=3000) * (t / d) ** 3 * 0.45


def music_trap(total):
    N = n_(total) + SR * 3
    L = np.zeros(N); R = np.zeros(N); duck = np.ones(N)
    def add(x, at, g=1.0, p=0.0):
        i = n_(at)
        if i >= N: return
        x = x[: N - i] * g
        L[i:i + len(x)] += x * (1 - max(0, p)); R[i:i + len(x)] += x * (1 + min(0, p))
    def ducker(at):
        i = n_(at); d = n_(0.25)
        if i >= N: return
        e = 1 - 0.55 * np.exp(-np.arange(min(d, N - i)) / (0.07 * SR))
        duck[i:i + len(e)] = np.minimum(duck[i:i + len(e)], e)

    DROP, CUT0, CUT1, FIN = 3.5, 23.4, 24.0, 40.5
    on = lambda a: (DROP <= a < CUT0) or (CUT1 <= a < FIN - 0.15)
    # ---- intro : nappe + montée inversée vers le drop
    add(pad(CHORDS[0][1] + [69], DROP + 0.6), 0.0, 1.2)
    add(reverse_swell(1.6), DROP - 1.6, 0.8)
    for k, m in enumerate([81, 76, 72]):
        add(bell(m, 2.0), 0.6 + k * 0.85, 0.35, 0.3 * (k - 1))
    # ---- grille
    bars = int((FIN - DROP) / BAR) + 2
    for b in range(bars):
        t0 = DROP + b * BAR
        root, ch = CHORDS[b % 4]
        if t0 < FIN:
            add(pad(ch, BAR + 0.4), t0, 0.9 if t0 >= 8.5 else 0.6)
        for s in range(8):
            at = t0 + s * STEP
            if not on(at): continue
            if s in (0, 3, 6):
                add(s808(mtof(root - 12 + 12 * (root < 40)), 0.9 if s != 6 else 0.5), at, 0.75)
            if s == 0:
                add(kick(), at, 0.8); ducker(at)
            if s == 4:
                add(clap(3 + b), at, 0.55, 0.05)
            # charleston : croches, roulement en triolets sur la fin d'une mesure sur deux
            if b % 2 == 1 and s >= 6:
                for r in range(3):
                    add(hat(100 + b * 10 + s * 3 + r), at + r * STEP / 3, 0.22 + 0.06 * r, 0.25)
            else:
                add(hat(10 + b * 8 + s), at, 0.3 if s % 2 else 0.2, 0.25)
            if s == 7 and b % 4 == 3:
                add(hat(900 + b, True), at, 0.2, -0.2)
            # mélodie cloche (à partir de l'analyse, 8.5 s)
            if at >= 8.5 and s % 2 == 0:
                add(bell(MEL[b % 4][s], 1.2), at, 0.16, 0.35 if s % 4 else -0.35)
    # ---- coupure (preuve) : souffle + 808 grave tenue
    add(reverse_swell(CUT1 - CUT0 + 0.2, 9), CUT0 - 0.2, 0.6)
    # ---- fin : 808 tenue + nappe + cloche
    add(s808(mtof(33), 2.4), FIN, 0.8)
    add(pad([57, 60, 64, 69], total - FIN + 1), FIN, 1.3)
    for k, m in enumerate([76, 72, 69, 81]):
        add(bell(m, 2.2), FIN + 0.5 + k * 0.6, 0.3, 0.3 * (k % 2 * 2 - 1))
    out = np.stack([L, R], 1)
    out[:, 0] *= duck; out[:, 1] *= duck
    out = out[: n_(total)]
    fo = n_(1.2)
    out[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    return out

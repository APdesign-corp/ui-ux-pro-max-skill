"""Conversion de timbre kNN-VC : chaque segment de VO (48 kHz) -> timbre de la voix de référence.
Le timing est conservé image par image (trames WavLM de 20 ms), donc la synchro mots/animation reste valable.

usage: convert.py KNNVC_DIR REF_WAV_16K SRC_CHUNK_DIR OUT_DIR [--topk 4] [--hf 0.5] [--ids L1,L2]
"""
import argparse
import json
import os
import sys
import wave

import numpy as np
import torch
import torchaudio.functional as AF

ap = argparse.ArgumentParser()
ap.add_argument('knnvc'); ap.add_argument('ref'); ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--topk', type=int, default=4)
ap.add_argument('--hf', type=float, default=0.5, help="réinjection des aigus (> 7 kHz) de la source, la sortie HiFiGAN est à 16 kHz")
ap.add_argument('--voiced-db', type=float, default=-36.0, help='trames de la référence gardées (parole, pas la musique)')
ap.add_argument('--ids', default=None)
ap.add_argument('--alpha', type=float, default=1.0, help='part du timbre cible (1 = conversion totale, <1 garde la diction source)')
ap.add_argument('--threads', type=int, default=3)
a = ap.parse_args()
torch.set_num_threads(a.threads)
sys.path.insert(0, a.knnvc)
from wavlm.WavLM import WavLM, WavLMConfig  # noqa: E402
from hifigan.models import Generator as HiFiGAN  # noqa: E402
from hifigan.utils import AttrDict  # noqa: E402

LAYER, HOP, SR = 6, 320, 16000


def rd(p):
    w = wave.open(p)
    x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
    if w.getnchannels() > 1:
        x = x.reshape(-1, w.getnchannels()).mean(1)
    return x, w.getframerate()


def wr(p, x, sr):
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


ck = torch.load(os.path.join(a.knnvc, 'WavLM-Large.pt'), map_location='cpu', weights_only=False)
wavlm = WavLM(WavLMConfig(ck['cfg'])); wavlm.load_state_dict(ck['model']); wavlm.eval()
h = AttrDict(json.load(open(os.path.join(a.knnvc, 'hifigan', 'config_v1_wavlm.json'))))
voc = HiFiGAN(h); voc.load_state_dict(torch.load(os.path.join(a.knnvc, 'prematch_g.pt'), map_location='cpu', weights_only=False)['generator'])
voc.eval(); voc.remove_weight_norm()


@torch.inference_mode()
def feats(x16):
    return wavlm.extract_features(torch.from_numpy(x16)[None], output_layer=LAYER, ret_layer_results=False)[0].squeeze(0)


# ---- ensemble de correspondance : trames de parole de la référence (sans les silences / la musique seule)
ref, rsr = rd(a.ref)
assert rsr == SR
pool = []
for i in range(0, len(ref), 20 * SR):
    seg = ref[i:i + 20 * SR]
    if len(seg) < SR:
        continue
    F = feats(seg)
    n = min(F.shape[0], len(seg) // HOP)
    e = np.array([20 * np.log10(np.sqrt(np.mean(seg[j * HOP:(j + 1) * HOP] ** 2)) + 1e-9) for j in range(n)])
    pool.append(F[:n][torch.from_numpy(e > a.voiced_db)])
pool = torch.cat(pool)
print(f'matching set : {pool.shape[0]} trames ({pool.shape[0] * HOP / SR:.1f} s de parole)', flush=True)
pn = pool / pool.norm(dim=-1, keepdim=True)

os.makedirs(a.out, exist_ok=True)
ids = a.ids.split(',') if a.ids else sorted(f[:-4] for f in os.listdir(a.src) if f.endswith('.wav'))
for cid in ids:
    x, sr = rd(os.path.join(a.src, cid + '.wav'))
    x16 = AF.resample(torch.from_numpy(x), sr, SR).numpy()
    with torch.inference_mode():
        q = feats(x16)
        qn = q / q.norm(dim=-1, keepdim=True)
        idx = (qn @ pn.T).topk(a.topk, dim=-1).indices
        tgt = pool[idx].mean(1)
        y = voc((a.alpha * tgt + (1 - a.alpha) * q)[None]).squeeze().numpy()
    # retour en 48 kHz, longueur identique à la source (timing des mots conservé)
    y48 = AF.resample(torch.from_numpy(y.astype(np.float32)), SR, sr).numpy()
    y48 = np.pad(y48, (0, max(0, len(x) - len(y48))))[:len(x)]
    # aigus (> 7 kHz) de la source pour l'air / les sifflantes, la sortie du vocodeur s'arrête à 8 kHz
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr)
    hp = np.fft.irfft(X * np.clip((f - 7000) / 1500, 0, 1), len(x))
    out = y48 + a.hf * hp
    rms = lambda v: np.sqrt(np.mean(v[np.abs(v) > 1e-4] ** 2)) if np.any(np.abs(v) > 1e-4) else 1
    out *= rms(x) / rms(out)
    out *= min(1, 0.95 / (np.abs(out).max() + 1e-9))
    wr(os.path.join(a.out, cid + '.wav'), out, sr)
    print(f'{cid}: {len(x) / sr:.2f} s', flush=True)

#!/usr/bin/env python3
"""
Contrôle qualité automatique d'une voix off générée :
  - intelligibilité : transcription Whisper (sherpa-onnx, français) de chaque segment,
    taux d'erreur de mots (WER) contre le texte exact du script ;
  - timbre : F0 médiane / dispersion (registre, expressivité) ;
  - débit : syllabes/seconde ;
  - technique : saturation, plancher de bruit, énergie > 8 kHz (bande passante).

    python3 scripts/voice_qa.py --dir voice/build/tom --asr <dossier whisper> [--json out.json]
"""
import argparse
import json
import os
import re
import unicodedata
import wave

import numpy as np


def read_wav(p):
    with wave.open(p) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(1)
    return x, sr


def to16k(x, sr):
    n = int(round(len(x) * 16000 / sr))
    X = np.fft.rfft(x)
    m = n // 2 + 1
    Y = np.zeros(m, dtype=complex)
    Y[:min(m, len(X))] = X[:min(m, len(X))]
    return (np.fft.irfft(Y, n) * (n / len(x))).astype(np.float32)


def norm_words(s):
    s = s.lower().replace('’', "'")
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9' ]+", ' ', s)
    s = s.replace('g s m', 'gsm').replace('g. s. m.', 'gsm')
    return [w for w in s.split() if w]


def wer(ref, hyp):
    r, h = norm_words(ref), norm_words(hyp)
    d = np.zeros((len(r) + 1, len(h) + 1), dtype=int)
    d[:, 0] = range(len(r) + 1)
    d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r), len(h)] / max(1, len(r))


def f0_track(x, sr):
    """F0 par autocorrélation normalisée (trames de 40 ms, pas de 10 ms)."""
    n, hop = int(0.04 * sr), int(0.01 * sr)
    lo, hi = int(sr / 400), int(sr / 60)
    out = []
    for i in range(0, len(x) - n, hop):
        f = x[i:i + n] * np.hanning(n)
        if np.sqrt(np.mean(f ** 2)) < 0.02:
            continue
        ac = np.correlate(f, f, 'full')[n - 1:]
        ac /= ac[0] + 1e-9
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.45:
            out.append(sr / k)
    return np.array(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', required=True)
    ap.add_argument('--asr', required=True, help='dossier sherpa-onnx-whisper-*')
    ap.add_argument('--json', default=None)
    a = ap.parse_args()
    import sherpa_onnx as so
    enc = next(f for f in os.listdir(a.asr) if f.endswith('encoder.int8.onnx'))
    dec = next(f for f in os.listdir(a.asr) if f.endswith('decoder.int8.onnx'))
    tok = next(f for f in os.listdir(a.asr) if f.endswith('tokens.txt'))
    rec = so.OfflineRecognizer.from_whisper(
        encoder=os.path.join(a.asr, enc), decoder=os.path.join(a.asr, dec), tokens=os.path.join(a.asr, tok),
        language='fr', task='transcribe', num_threads=2)
    layout = json.load(open(os.path.join(a.dir, 'vo_layout.json')))
    rows, f0all, syl, spd = [], [], 0, 0.0
    for L in layout['lines']:
        for c in L['chunks']:
            x, sr = read_wav(os.path.join(a.dir, 'chunks', f"{c['id']}.wav"))
            s = rec.create_stream()
            pad = np.zeros(int(0.3 * 16000), dtype=np.float32)
            s.accept_waveform(16000, np.concatenate([pad, to16k(x, sr), pad]))
            rec.decode_stream(s)
            hyp = s.result.text.strip()
            f0 = f0_track(x, sr)
            f0all.extend(f0.tolist())
            nsyl = len(re.findall(r'[aeiouyàâéèêëîïôûùü]+', c['text'].lower()))
            syl += nsyl
            spd += c['speech'][1] - c['speech'][0]
            rows.append({'id': c['id'], 'text': c['text'], 'asr': hyp, 'wer': round(wer(c['text'], hyp), 3),
                         'asr_parakeet': c.get('asr_on_raw'),
                         'wer_parakeet': round(wer(c['text'], c['asr_on_raw']), 3) if c.get('asr_on_raw') else None,
                         'f0_med': round(float(np.median(f0)), 1) if len(f0) else None,
                         'peak': round(float(np.max(np.abs(x))), 3)})
    full, sr = read_wav(os.path.join(a.dir, 'vo_dry.wav'))
    X = np.abs(np.fft.rfft(full)) ** 2
    fr = np.fft.rfftfreq(len(full), 1 / sr)
    f0all = np.array(f0all)
    summary = {
        'voice': layout['voice'], 'gender_declared': layout['gender'], 'vo_end': layout['vo_end'],
        'wer_mean': round(float(np.mean([r['wer'] for r in rows])), 3),
        'wer_parakeet_mean': round(float(np.mean([r['wer_parakeet'] for r in rows if r['wer_parakeet'] is not None])), 3) if any(r['wer_parakeet'] is not None for r in rows) else None,
        'chunks_wer_gt0': [r['id'] for r in rows if r['wer'] > 0 or (r['wer_parakeet'] or 0) > 0],
        'f0_median_hz': round(float(np.median(f0all)), 1) if len(f0all) else None,
        'f0_p10_p90_hz': [round(float(np.percentile(f0all, 10)), 1), round(float(np.percentile(f0all, 90)), 1)] if len(f0all) else None,
        'f0_range_semitones': round(float(12 * np.log2(np.percentile(f0all, 90) / np.percentile(f0all, 10))), 2) if len(f0all) else None,
        'syllables_per_s': round(syl / max(spd, 1e-6), 2),
        'hf_energy_above_8k_pct': round(float(100 * X[fr > 8000].sum() / X.sum()), 3),
        'native_sr': layout['lines'][0]['chunks'][0]['native_sr'],
        'rows': rows,
    }
    out = json.dumps(summary, indent=1, ensure_ascii=False)
    if a.json:
        open(a.json, 'w').write(out)
    short = {k: v for k, v in summary.items() if k != 'rows'}
    print(json.dumps(short, ensure_ascii=False))
    for r in rows:
        print(f"  {r['id']:4s} wer={r['wer']:.2f}/{r['wer_parakeet']} f0={r['f0_med']} | {r['text']} => W:{r['asr']} | P:{r['asr_parakeet']}")


if __name__ == '__main__':
    main()

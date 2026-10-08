#!/usr/bin/env python3
"""
Voix off IA : synthèse neuronale hors-ligne (sherpa-onnx : Piper/VITS, Coqui, Kokoro)
du script voice/script.json, segment par segment, puis mise en place (layout)
avec les pauses de la direction d'acteur. Produit :

  <out>/chunks/<id>.wav     segments 48 kHz mono (silences de bord retirés)
  <out>/vo_dry.wav          voix brute posée sur la timeline (48 kHz mono)
  <out>/vo_layout.json      instants de chaque segment ET de chaque mot-clé
                            (sert à monter l'image autour de la voix)

    python3 scripts/voice_tts.py --voice tom --models <dir> --out voice/build/tom \
        [--speed 1.0] [--noise-scale 0.667] [--noise-w 0.8] [--seed 1]

Prérequis : pip install sherpa-onnx numpy espeakng-loader phonemizer-fork
Modèles   : https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
"""
import argparse
import json
import os
import re
import unicodedata
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000

VOICES = {
    # id: (engine, dossier, fichier modèle, speaker id, multiplicateur de vitesse, genre)
    'tom':         ('vits', 'vits-piper-fr_FR-tom-medium', 'fr_FR-tom-medium.onnx', 0, 1.0, 'M'),
    'miro':        ('vits', 'vits-piper-fr_FR-miro-high', 'fr_FR-miro-high.onnx', 0, 1.22, 'M'),
    'upmc-pierre': ('vits', 'vits-piper-fr_FR-upmc-medium', 'fr_FR-upmc-medium.onnx', 1, 1.0, 'M'),
    'tjiho1':      ('vits', 'vits-piper-fr_FR-tjiho-model1', 'fr_FR-tjiho-model1.onnx', 0, 1.0, 'M'),
    'tjiho2':      ('vits', 'vits-piper-fr_FR-tjiho-model2', 'fr_FR-tjiho-model2.onnx', 0, 1.0, 'M'),
    'tjiho3':      ('vits', 'vits-piper-fr_FR-tjiho-model3', 'fr_FR-tjiho-model3.onnx', 0, 1.0, 'M'),
    'gilles':      ('vits', 'vits-piper-fr_FR-gilles-low', 'fr_FR-gilles-low.onnx', 0, 1.0, 'M'),
    'css10':       ('coqui', 'vits-coqui-fr-css10', 'model.onnx', 0, 1.0, 'M'),
    'siwis':       ('vits', 'vits-piper-fr_FR-siwis-medium', 'fr_FR-siwis-medium.onnx', 0, 1.0, 'F'),
    'kokoro-siwis': ('kokoro', 'kokoro-multi-lang-v1_0', 'model.onnx', 30, 1.0, 'F'),
    # Supertonic 3 (MIT, flow matching, 31 langues) : voix 5-9 masculines, 0-4 féminines
    'st-f0': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 0, 1.0, 'F'),  # la plus proche de la réf. client
    'st-f2': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 2, 1.0, 'F'),
    'st-m5': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 5, 1.0, 'M'),
    'st-m6': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 6, 1.0, 'M'),
    'st-m7': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 7, 1.0, 'M'),
    'st-m8': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 8, 1.0, 'M'),
    'st-m9': ('supertonic', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11', '', 9, 1.0, 'M'),
}

VOWELS = set('aeiouyɑɛɔøœəɐɪʊʏæɜɞɘɵɤɯɨɒ')
WORD_RE = r"[\wÀ-ÿ'’-]+"


def make_tts(voice, models, noise_scale, noise_w, threads):
    import sherpa_onnx as so
    eng, d, mf, sid, _, _ = VOICES[voice]
    base = os.path.join(models, d)
    mc = so.OfflineTtsModelConfig(num_threads=threads, provider='cpu', debug=False)
    if eng == 'supertonic':
        j = lambda f: os.path.join(base, f)
        mc.supertonic = so.OfflineTtsSupertonicModelConfig(
            duration_predictor=j('duration_predictor.int8.onnx'), text_encoder=j('text_encoder.int8.onnx'),
            vector_estimator=j('vector_estimator.int8.onnx'), vocoder=j('vocoder.int8.onnx'), tts_json=j('tts.json'),
            unicode_indexer=j('unicode_indexer.bin'), voice_style=j('voice.bin'))
        return SupertonicWrap(so.OfflineTts(so.OfflineTtsConfig(model=mc))), sid
    if eng in ('vits', 'coqui'):
        data_dir = os.path.join(base, 'espeak-ng-data') if eng == 'vits' else ''
        mc.vits = so.OfflineTtsVitsModelConfig(
            model=os.path.join(base, mf), tokens=os.path.join(base, 'tokens.txt'), data_dir=data_dir,
            noise_scale=noise_scale, noise_scale_w=noise_w, length_scale=1.0)
    else:
        mc.kokoro = so.OfflineTtsKokoroModelConfig(
            model=os.path.join(base, mf), voices=os.path.join(base, 'voices.bin'), tokens=os.path.join(base, 'tokens.txt'),
            data_dir=os.path.join(base, 'espeak-ng-data'), dict_dir=os.path.join(base, 'dict'), lang='fr',
            lexicon=','.join(os.path.join(base, f) for f in ['lexicon-us-en.txt', 'lexicon-zh.txt']))
    return so.OfflineTts(so.OfflineTtsConfig(model=mc, max_num_sentences=1)), sid


class SupertonicWrap:
    """Interface generate(text, sid, speed) commune avec Piper/Kokoro."""
    STEPS = 24

    def __init__(self, tts):
        self.tts = tts

    def generate(self, text, sid=0, speed=1.0):
        import sherpa_onnx as so
        g = so.GenerationConfig()
        g.sid, g.num_steps, g.speed = sid, self.STEPS, speed
        g.extra['lang'] = 'fr'
        return self.tts.generate(text, g)


def make_aligner(path, threads):
    """ASR multilingue Parakeet TDT (sherpa-onnx) : horodatage des mots (pas de 80 ms)."""
    if not path:
        return None
    import sherpa_onnx as so
    return so.OfflineRecognizer.from_transducer(
        encoder=os.path.join(path, 'encoder.int8.onnx'), decoder=os.path.join(path, 'decoder.int8.onnx'),
        joiner=os.path.join(path, 'joiner.int8.onnx'), tokens=os.path.join(path, 'tokens.txt'),
        model_type='nemo_transducer', num_threads=threads)


def resample(x, sr_in, sr_out=SR):
    """Rééchantillonnage à bande limitée (FFT) — sans repliement."""
    if sr_in == sr_out:
        return x.astype(np.float64)
    n_out = int(round(len(x) * sr_out / sr_in))
    X = np.fft.rfft(x)
    m = n_out // 2 + 1
    Y = np.zeros(m, dtype=complex)
    k = min(len(X), m)
    Y[:k] = X[:k]
    taper = np.ones(k)
    t0 = int(k * 0.94)
    taper[t0:] = np.linspace(1, 0, k - t0)
    Y[:k] *= taper
    return np.fft.irfft(Y, n_out) * (n_out / len(x))


def envelope(x, win_s=0.01):
    win = max(1, int(win_s * SR))
    return np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode='same') + 1e-12)


def trim(x, thresh_db=-48, pad=0.012):
    env = envelope(x)
    th = np.max(env) * 10 ** (thresh_db / 20)
    idx = np.where(env > th)[0]
    if not len(idx):
        return x, (0.0, len(x) / SR)
    a = max(0, idx[0] - int(pad * SR))
    b = min(len(x), idx[-1] + int(pad * SR))
    y = x[a:b].copy()
    f = int(0.004 * SR)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y, (idx[0] / SR - a / SR, (idx[-1] - a) / SR)


def norm(w):
    w = w.lower().replace('’', "'")
    w = ''.join(c for c in unicodedata.normalize('NFD', w) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", '', w)


def phonemes(words):
    try:
        import espeakng_loader
        from phonemizer.backend.espeak.wrapper import EspeakWrapper
        EspeakWrapper.set_library(espeakng_loader.get_library_path())
        EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
        from phonemizer import phonemize
        return phonemize(words, language='fr-fr', backend='espeak', strip=True)
    except Exception:
        return words


def weight(ph):
    w = 0.0
    for ch in ph:
        if unicodedata.combining(ch) or ch in "ˈˌː'-":
            continue
        w += 1.7 if ch in VOWELS else 1.0
    return max(w, 1.0)


def recognize(rec, x):
    """Mots reconnus + instants de début (s, relatifs au segment)."""
    n = int(round(len(x) * 16000 / SR))
    X = np.fft.rfft(x)
    Y = np.zeros(n // 2 + 1, dtype=complex)
    k = min(len(X), len(Y))
    Y[:k] = X[:k]
    y = (np.fft.irfft(Y, n) * (n / len(x))).astype(np.float32)
    pad = np.zeros(4800, np.float32)
    s = rec.create_stream()
    s.accept_waveform(16000, np.concatenate([pad, y, pad]))
    rec.decode_stream(s)
    words = []
    for tok, ts in zip(s.result.tokens, s.result.timestamps):
        t = ts - 0.3
        if tok.startswith(' ') or not words:
            if norm(tok):
                words.append([tok.strip(), t])
        else:
            if norm(tok):
                words[-1][0] += tok
    return s.result.text.strip(), [(w, t) for w, t in words if norm(w)]


def align(expected, recog):
    """Alignement Needleman-Wunsch mots attendus / mots reconnus (similarité de graphie)."""
    from difflib import SequenceMatcher
    n, m = len(expected), len(recog)
    S = np.full((n + 1, m + 1), -1e9)
    S[0, :] = -0.4 * np.arange(m + 1)
    S[:, 0] = -0.4 * np.arange(n + 1)
    bt = np.zeros((n + 1, m + 1), dtype=int)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sim = SequenceMatcher(None, norm(expected[i - 1]), norm(recog[j - 1][0])).ratio()
            opts = (S[i - 1, j - 1] + sim - 0.3, S[i - 1, j] - 0.4, S[i, j - 1] - 0.4)
            bt[i, j] = int(np.argmax(opts))
            S[i, j] = opts[bt[i, j]]
    i, j, pairs = n, m, {}
    while i > 0 and j > 0:
        if bt[i, j] == 0:
            pairs[i - 1] = recog[j - 1][1]
            i, j = i - 1, j - 1
        elif bt[i, j] == 1:
            i -= 1
        else:
            j -= 1
    return pairs


def word_times(display, tts_text, x, speech, rec):
    """Instant de début de chaque mot : ASR quand il est reconnu, sinon interpolation phonétique."""
    exp = re.findall(WORD_RE, display)
    exp_tts = re.findall(WORD_RE, tts_text)
    if len(exp_tts) != len(exp):
        exp_tts = exp
    ws = [weight(p) for p in phonemes(exp_tts)]
    cum = np.concatenate([[0], np.cumsum(ws)]) / sum(ws)
    s0, s1 = speech
    est = [s0 + c * (s1 - s0) for c in cum[:-1]]
    asr_text, times, pairs = None, list(est), {}
    if rec is not None:
        asr_text, recog = recognize(rec, x)
        pairs = align(exp_tts, recog)
        for i, t in pairs.items():
            times[i] = max(s0, min(s1, t + 0.02))
        # mots non reconnus : interpolation entre ancres
        anchors = sorted([(i, times[i]) for i in pairs] + [(-1, s0), (len(exp), s1)])
        for i in range(len(exp)):
            if i in pairs:
                continue
            lo = max(a for a in anchors if a[0] < i)
            hi = min(a for a in anchors if a[0] > i)
            cl = cum[lo[0]] if lo[0] >= 0 else 0
            ch = cum[hi[0]] if hi[0] < len(exp) else 1
            times[i] = lo[1] + (cum[i] - cl) / max(1e-6, ch - cl) * (hi[1] - lo[1])
    # monotonie
    for i in range(1, len(times)):
        times[i] = max(times[i], times[i - 1] + 0.04)
    return exp, times, asr_text, len(pairs)


def insert_breaks(x, words, times, breaks, speech_end):
    """Insère les pauses de la direction d'acteur dans le creux d'énergie après le mot."""
    env = envelope(x, 0.012)
    out, last, shift = [], 0, 0.0
    new_times = list(times)
    for br in sorted(breaks, key=lambda b: words.index(b['after']) if b['after'] in words else 1e9):
        if br['after'] not in words:
            continue
        k = words.index(br['after'])
        nxt = times[k + 1] if k + 1 < len(times) else speech_end
        a, b = int(max(times[k] + 0.08, nxt - 0.16) * SR), int(min(len(x) / SR, nxt + 0.03) * SR)
        if b <= a:
            continue
        cut = a + int(np.argmin(env[a:b]))
        f = int(0.006 * SR)
        seg = x[last:cut].copy()
        if len(seg) > f:
            seg[-f:] *= np.linspace(1, 0, f)
        out += [seg, np.zeros(int(br['sec'] * SR))]
        last = cut
        tail = x[cut:cut + f]
        if len(tail) == f:
            x[cut:cut + f] = tail * np.linspace(0, 1, f)
        for i in range(k + 1, len(new_times)):
            new_times[i] += br['sec']
        shift += br['sec']
    out.append(x[last:])
    return np.concatenate(out), new_times, shift


def write_wav(path, x, sr=SR):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def norm_words(s):
    s = s.lower().replace('’', "'")
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9' ]+", ' ', s)
    s = re.sub(r"\bg s m\b", 'gsm', s)
    # sigles : la transcription écrit souvent la forme parlée (« trois D », « D M », « A P »)
    s = re.sub(r"\btrois d\b|\b3 d\b", '3d', s)
    s = re.sub(r"\bv f x\b|\bvfx\b", 'vfx', s)
    s = re.sub(r"\bd m\b", 'dm', s)
    s = re.sub(r"\ba p\b", 'ap', s)
    return [w for w in s.split() if w]


def wer(ref, hyp):
    r, h = norm_words(ref), norm_words(hyp or '')
    d = np.zeros((len(r) + 1, len(h) + 1), dtype=int)
    d[:, 0] = range(len(r) + 1)
    d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r), len(h)] / max(1, len(r))


def make_whisper(path, threads):
    if not path:
        return None
    import sherpa_onnx as so
    f = lambda suf: os.path.join(path, next(x for x in os.listdir(path) if x.endswith(suf)))
    return so.OfflineRecognizer.from_whisper(encoder=f('encoder.int8.onnx'), decoder=f('decoder.int8.onnx'),
                                             tokens=f('tokens.txt'), language='fr', task='transcribe', num_threads=threads)


def transcribe(rec, x):
    n = int(round(len(x) * 16000 / SR))
    X = np.fft.rfft(x)
    Y = np.zeros(n // 2 + 1, dtype=complex)
    k = min(len(X), len(Y))
    Y[:k] = X[:k]
    y = (np.fft.irfft(Y, n) * (n / len(x))).astype(np.float32)
    pad = np.zeros(4800, np.float32)
    st = rec.create_stream()
    st.accept_waveform(16000, np.concatenate([pad, y, pad]))
    rec.decode_stream(st)
    return st.result.text.strip()


def expressiveness(x):
    """Amplitude mélodique (demi-tons entre les centiles 10 et 90 de F0) : plus = moins monotone."""
    from voice_qa import f0_track
    f0 = f0_track(x[::3], SR // 3)
    if len(f0) < 8:
        return 0.0
    lo, hi = np.percentile(f0, [10, 90])
    return float(12 * np.log2(hi / lo))


def apply_respell(text, respell):
    def rep(m):
        w = m.group(0)
        return respell.get(w, w)
    return re.sub(WORD_RE, rep, text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', required=True, choices=list(VOICES))
    ap.add_argument('--models', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--script', default=os.path.join(ROOT, 'voice', 'script.json'))
    ap.add_argument('--aligner', default=None, help='dossier sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8')
    ap.add_argument('--speed', type=float, default=1.0, help='multiplicateur global de vitesse')
    ap.add_argument('--noise-scale', type=float, default=0.667)
    ap.add_argument('--noise-w', type=float, default=0.8)
    ap.add_argument('--respell', default=None, help='JSON {mot: graphie} prioritaire sur le script')
    ap.add_argument('--threads', type=int, default=2)
    ap.add_argument('--expr', type=float, default=0.025, help="poids de l'expressivité (amplitude de F0) dans le choix des prises")
    ap.add_argument('--takes', type=int, default=1, help='prises par phrase (la meilleure est retenue)')
    ap.add_argument('--judge-whisper', default=None, help='dossier sherpa-onnx-whisper-* (2e juge ASR)')
    ap.add_argument('--variants', default=None, help='JSON {mot: [graphies]} essayées en alternance sur les prises')
    a = ap.parse_args()

    script = json.load(open(a.script))
    respell = dict(script.get('respell', {}))
    if a.respell:
        respell.update(json.loads(a.respell))
    tts, sid = make_tts(a.voice, a.models, a.noise_scale, a.noise_w, a.threads)
    rec = make_aligner(a.aligner, a.threads)
    judge = make_whisper(a.judge_whisper, a.threads)
    variants = json.loads(a.variants) if a.variants else {}
    speed_mul = VOICES[a.voice][4] * a.speed
    os.makedirs(os.path.join(a.out, 'chunks'), exist_ok=True)

    t = 0.0
    layout = {'voice': a.voice, 'gender': VOICES[a.voice][5], 'params': vars(a), 'respell': respell, 'lines': []}
    pieces = []
    for line in script['lines']:
        t += line.get('gap_before', 0.4)
        L = {'id': line['id'], 'scene': line['scene'], 'tone': line.get('tone'), 'start': round(t, 3), 'chunks': []}
        for c in line['chunks']:
            # plusieurs prises (VITS est stochastique), jugées par 2 ASR ; on garde la meilleure
            # variantes de diction : graphies (variants) et formulations alternatives (tts_alt, même nb de mots)
            bases = [c.get('tts', c['text'])] + c.get('tts_alt', [])
            present = [w for w in variants if re.search(r'\b' + re.escape(w) + r'\b', c['text'])]
            n_takes = max(1, a.takes if a.takes > 1 else 1) * (c.get('takes_mul', 1) if a.takes > 1 else 1)
            takes = []
            for k in range(n_takes):
                rs = dict(respell)
                for j, w in enumerate(present):
                    opts = variants[w]
                    rs[w] = opts[(k // (j + 1)) % len(opts)] if j else opts[k % len(opts)]
                n_opt = len(variants[present[0]]) if present else 1
                tts_text = apply_respell(bases[(k // n_opt) % len(bases)], rs)
                audio = tts.generate(tts_text, sid=sid, speed=c.get('speed', 1.0) * speed_mul)
                x = resample(np.asarray(audio.samples, dtype=np.float64), audio.sample_rate)
                x, speech = trim(x)
                tk = {'tts': tts_text, 'x': x, 'speech': speech, 'sr': audio.sample_rate, 'dur': len(x) / SR}
                if a.takes > 1 and rec is not None:
                    tk['asr_p'], _ = recognize(rec, x)
                    tk['wer_p'] = wer(c['text'], tk['asr_p'])
                    tk['asr_w'] = transcribe(judge, x) if judge else None
                    tk['wer_w'] = wer(c['text'], tk['asr_w']) if judge else 0.0
                    tk['expr'] = expressiveness(x)
                takes.append(tk)
            if len(takes) > 1:
                med = float(np.median([t['dur'] for t in takes]))
                for tk in takes:
                    # mot isolé (judge=whisper) : Parakeet l'anglicise (« Troy's D »), seul Whisper juge
                    asr = 2 * tk['wer_w'] if c.get('judge') == 'whisper' else 2 * tk['wer_p'] + tk['wer_w']
                    tk['score'] = (asr + 0.3 * abs(tk['dur'] - med) / med
                                   - a.expr * min(12.0, tk.get('expr', 0.0)))  # intonation vivante
                best = min(range(len(takes)), key=lambda i: takes[i]['score'])
            else:
                best = 0
            T = takes[best]
            tts_text, x, speech = T['tts'], T['x'], T['speech']
            audio = type('A', (), {'sample_rate': T['sr']})
            words, times, asr_text, n_al = word_times(c['text'], tts_text, x, speech, rec)
            x, times, shift = insert_breaks(x, words, times, c.get('breaks', []), speech[1])
            speech = (speech[0], speech[1] + shift)
            x = x / max(1e-6, np.max(np.abs(x))) * 0.89 * 10 ** (c.get('gain_db', 0) / 20)
            write_wav(os.path.join(a.out, 'chunks', f"{c['id']}.wav"), x)
            dur = len(x) / SR
            L['chunks'].append({
                'id': c['id'], 'text': c['text'], 'tts': tts_text, 'start': round(t, 3), 'end': round(t + dur, 3),
                'speech': [round(t + speech[0], 3), round(t + speech[1], 3)],
                'words': [[w, round(t + tw, 3)] for w, tw in zip(words, times)],
                'aligned_words': n_al, 'asr_on_raw': asr_text, 'native_sr': audio.sample_rate,
                'takes': [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in tk.items() if k not in ('x', 'speech')}
                          for tk in takes] if len(takes) > 1 else None,
                'chosen_take': best,
            })
            pieces.append((t, x))
            t += dur + c.get('pause', 0)
        L['end'] = L['chunks'][-1]['end']
        layout['lines'].append(L)
    layout['vo_end'] = round(t, 3)

    total = np.zeros(int((t + 0.5) * SR))
    for st, x in pieces:
        i = int(st * SR)
        total[i:i + len(x)] += x
    write_wav(os.path.join(a.out, 'vo_dry.wav'), total)
    json.dump(layout, open(os.path.join(a.out, 'vo_layout.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"{a.voice}: voix {layout['vo_end']:.2f} s, {sum(len(l['chunks']) for l in layout['lines'])} segments -> {a.out}")


if __name__ == '__main__':
    main()

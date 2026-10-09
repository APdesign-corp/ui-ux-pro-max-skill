#!/usr/bin/env bash
# Rendu complet : tranches de 30 s (images supprimées après chaque tranche), son, assemblage MP4 H.264/AAC.
set -e
cd "$(dirname "$0")/.."
node scripts/render.mjs --cues-only --format 9x16 > /dev/null 2>&1
D=$(python3 -c "import json;print(json.load(open('out/cues.json'))['duration'])")
mkdir -p out/chunks
i=0; s=0
while python3 -c "import sys;sys.exit(0 if $s < $D else 1)"; do
  e=$(python3 -c "print(min($s+30,$D))")
  f=out/chunks/c$(printf %02d $i).mp4
  [ -f "$f" ] || node scripts/render.mjs --format 9x16 --fps 30 --workers 3 --from $s --to $e --no-audio --out $f --frames-dir out/frames-c$i > out/chunks/c$i.log 2>&1
  i=$((i+1)); s=$e
done
python3 scripts/sound_design.py --out out/setila-sound.wav --duration $D --cues out/cues.json
ls out/chunks/c*.mp4 | sed "s#^out/chunks/#file '#; s#\$#'#" > out/chunks/list.txt
mkdir -p livraison
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i out/chunks/list.txt -i out/setila-sound.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -r 30 -movflags +faststart \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 256k -ar 48000 -shortest livraison/SETILA-STUDIO_9x16_1080x1920_30fps.mp4
echo RENDU_OK

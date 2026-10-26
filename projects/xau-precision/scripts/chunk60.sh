#!/usr/bin/env bash
# Rendu 60 i/s par morceaux (disque limité) en réutilisant les images paires du master 30 i/s.
set -e
cd "$(dirname "$0")/.."
M=out/xau-precision-9x16-1080x1920-30fps.mp4
DUR=45.1
CH=(0 15 30 $DUR)
for k in 0 1 2; do
  a=${CH[$k]}; b=${CH[$((k+1))]}; d=out/c60_$k; clip=out/c60_$k.mp4
  [ -f $clip ] && continue
  mkdir -p $d
  if [ -f $M ] && [ ! -f $d/.seeded ]; then
    tmp=out/c60_tmp; rm -rf $tmp; mkdir -p $tmp
    ffmpeg -hide_banner -loglevel error -ss $a -to $b -i $M -start_number 0 $tmp/g_%05d.png
    for f in $tmp/g_*.png; do j=$((10#$(basename $f .png | cut -c3-))); mv $f $d/f_$(printf %05d $((2*j))).png; done
    rm -rf $tmp; touch $d/.seeded
  fi
  node scripts/render.mjs --format 9x16 --fps 60 --workers 3 --from $a --to $b --no-audio --out $clip --frames-dir $d
done
cd scripts && python3 sound_design.py --out ../out/xau-precision-sound.wav --duration $DUR --cues ../out/cues.json && cd ..
printf "file 'c60_0.mp4'\nfile 'c60_1.mp4'\nfile 'c60_2.mp4'\n" > out/c60_list.txt
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i out/c60_list.txt -i out/xau-precision-sound.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/xau-precision-9x16-1080x1920-60fps.mp4
mkdir -p out/livraison
ffmpeg -y -hide_banner -loglevel error -i out/xau-precision-9x16-1080x1920-60fps.mp4 -c:v libx264 -preset medium -b:v 9M -maxrate 12M -bufsize 18M -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -movflags +faststart out/livraison/XAU-PRECISION_9x16_1080p_60fps.mp4
echo DONE

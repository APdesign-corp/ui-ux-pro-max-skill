#!/usr/bin/env bash
# 1) version 30 i/s (rapide, envoyée d'abord) 2) version 60 i/s qui réutilise ses images paires
set -e
cd "$(dirname "$0")/.."
node scripts/render.mjs --format 9x16 --fps 30 --workers 3 --frames-dir out/frames30
mkdir -p out/livraison
ffmpeg -y -hide_banner -loglevel error -i out/xau-precision-9x16-1080x1920-30fps.mp4 -c:v libx264 -preset medium -b:v 7M -maxrate 9M -bufsize 14M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart out/livraison/XAU-PRECISION_9x16_1080p_30fps.mp4
echo READY30
bash scripts/chunk60.sh

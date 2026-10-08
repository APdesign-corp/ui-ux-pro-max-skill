#!/usr/bin/env bash
# Fichiers de livraison à partir des masters rendus par scripts/render.mjs.
# H.264 (lisible par toutes les télés et clés USB), 60 i/s, yuv420p, AAC 48 kHz, débit plafonné
# selon le niveau H.264 pour rester compatible avec les lecteurs des télés.
#
#   bash scripts/deliver.sh            → out/livraison/*.mp4 (+ copies légères pour l'envoi)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/livraison
enc() { # src dst level maxrate
  local src="$1" dst="$2" level="$3" max="$4"
  [ -f "$src" ] || { echo "absent : $src"; return 0; }
  ffmpeg -y -hide_banner -loglevel error -i "$src" -map 0:v -map 0:a? \
    -c:v libx264 -preset slow -crf 16 -maxrate "$max" -bufsize "$max" -profile:v high -level "$level" \
    -pix_fmt yuv420p -r 60 -g 120 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -ar 48000 -movflags +faststart \
    -metadata title="GSM Center Liège — Rue St Léonard 203, 4000 Liège" "$dst"
  echo "✓ $dst ($(du -h "$dst" | cut -f1))"
}
enc out/gsm-center-portails-16x9-1920x1080-60fps.mp4 out/livraison/GSM-CENTER-LIEGE_16x9_1080p_60fps.mp4 4.2 30M
enc out/gsm-center-portails-9x16-1080x1920-60fps.mp4 out/livraison/GSM-CENTER-LIEGE_9x16_1080p_60fps.mp4 4.2 30M
enc out/gsm-center-portails-16x9-3840x2160-60fps.mp4 out/livraison/GSM-CENTER-LIEGE_16x9_4K_60fps.mp4 5.2 80M
enc out/gsm-center-portails-9x16-2160x3840-60fps.mp4 out/livraison/GSM-CENTER-LIEGE_9x16_4K_60fps.mp4 5.2 80M

# copies légères (< 30 Mo) pour l'envoi rapide par message
light() {
  local src="$1" dst="$2"
  [ -f "$src" ] || return 0
  ffmpeg -y -hide_banner -loglevel error -i "$src" -c:v libx264 -preset slow -b:v 6.8M -maxrate 9M -bufsize 14M \
    -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$dst"
  echo "✓ $dst ($(du -h "$dst" | cut -f1))"
}
light out/livraison/GSM-CENTER-LIEGE_16x9_1080p_60fps.mp4 out/livraison/envoi_16x9_1080p.mp4
light out/livraison/GSM-CENTER-LIEGE_9x16_1080p_60fps.mp4 out/livraison/envoi_9x16_1080p.mp4

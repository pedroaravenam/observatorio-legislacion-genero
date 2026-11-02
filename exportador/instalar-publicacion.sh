#!/usr/bin/env bash
# Instala el temporizador diario que publica en Cloudflare D1 los cambios de la base de ingesta.
# Uso: exportador/instalar-publicacion.sh [fecha ISO de la última publicación completa]
set -euo pipefail

aqui=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
estado=${XDG_STATE_HOME:-$HOME/.local/state}/observatorio-publico
unidades=${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user

if [[ ! -x "$aqui/../sitio/node_modules/.bin/wrangler" ]]; then
  echo 'Falta wrangler: ejecute npm install en sitio/.' >&2
  exit 2
fi

mkdir -p "$estado" "$unidades"
if [[ $# -ge 1 ]]; then
  printf '%s\n' "$1" > "$estado/ultima-publicacion"
elif [[ ! -f "$estado/ultima-publicacion" ]]; then
  echo 'Indique la fecha de la última publicación completa, por ejemplo 2026-11-02T20:30:00+00:00.' >&2
  exit 2
fi

cp "$aqui/systemd/observatorio-publicar.service" "$aqui/systemd/observatorio-publicar.timer" "$unidades/"
systemctl --user daemon-reload
systemctl --user enable --now observatorio-publicar.timer
systemctl --user list-timers observatorio-publicar.timer --no-pager

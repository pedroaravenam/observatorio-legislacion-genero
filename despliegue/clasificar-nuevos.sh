#!/usr/bin/env bash
# Clasifica los proyectos nuevos con el agente y publica el sitio. Lo ejecuta el temporizador de usuario
# observatorio-clasificar (09:30, hora de Chile, después de la consulta diaria del VPS); también se puede correr a mano.
# Si falla, el VPS envía un correo con las últimas líneas del registro.
set -euo pipefail
# Bajo systemd el PATH es mínimo; claude y node pueden estar en ~/.local/bin.
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."

vps=${VPS:-atendia-development}
registro=$(mktemp)
trap 'rm -f "$registro"' EXIT

if node --disable-warning=ExperimentalWarning despliegue/clasificador/clasificar.mjs pendientes >"$registro" 2>&1; then
  cat "$registro"
else
  cat "$registro" >&2
  tail -n 30 "$registro" |
    ssh -o BatchMode=yes -o ConnectTimeout=20 "$vps" "sudo /opt/observatorio/alertar.sh aviso clasificador-local 'Observatorio: falló la clasificación de proyectos nuevos'" ||
    echo 'No se pudo enviar el aviso por correo.' >&2
  exit 1
fi

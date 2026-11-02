#!/usr/bin/env bash
# Trabajos programados del Observatorio en el VPS. Uso: trabajo.sh fecha|completa|publicar
#   fecha     consulta diaria del Senado por fecha y luego publica
#   completa  carga completa reanudable del Senado y luego publica
#   publicar  solo reescribe la base pública SQLite desde la base de ingesta
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

modo=${1:?Use fecha, completa o publicar}
case "$modo" in
  fecha) variable=Ingesta__FechaSenado ;;
  completa) variable=Ingesta__CompletaSenado ;;
  publicar) variable= ;;
  *) echo 'Modo inválido: use fecha, completa o publicar.' >&2; exit 2 ;;
esac

# Un solo trabajo a la vez: la carga completa puede durar horas y coincidir con la diaria.
exec 9>/run/lock/observatorio-trabajo.lock
flock -w 43200 9 || { echo 'Otro trabajo del Observatorio sigue corriendo.' >&2; exit 1; }

compose=(docker compose -p observatorio --profile trabajos)
"${compose[@]}" up -d db
"${compose[@]}" run --rm migraciones >/dev/null
if [[ -n "$variable" ]]; then
  "${compose[@]}" run --rm -e "$variable=true" ingesta
fi
"${compose[@]}" run --rm exportador

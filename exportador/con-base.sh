#!/usr/bin/env bash
# Levanta la base de ingesta persistente, ejecuta un archivo SQL con psql y la detiene.
# Usa el mismo bloqueo que los trabajos programados del Senado para no correr en paralelo con ellos.
# Uso: con-base.sh archivo.sql salida.sql   (variable opcional DESDE, ISO 8601)
set -euo pipefail
sql=$1
salida=$2
conf=${OBSERVATORIO_SENADO_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/observatorio-genero/ingesta.conf}
datos=${OBSERVATORIO_SENADO_DATOS:-${XDG_DATA_HOME:-$HOME/.local/share}/observatorio-genero/postgres}
bloqueo=${XDG_RUNTIME_DIR:-/tmp}/observatorio-genero
mkdir -p "$bloqueo"
exec 9>"$bloqueo/senado.lock"
flock -w 43200 9 || { echo 'No se pudo obtener el bloqueo de ingesta del Senado.' >&2; exit 1; }

base=observatorio-exporta-$$
trap 'docker stop --time 30 "$base" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --network host --name "$base" --env-file "$conf" \
  -v "$datos:/var/lib/postgresql/data:Z,U" postgres:17 \
  -c listen_addresses=127.0.0.1 -c port=55432 >/dev/null
for _ in {1..30}; do
  docker exec "$base" pg_isready -h 127.0.0.1 -p 55432 -U observatorio -d observatorio >/dev/null 2>&1 && break
  sleep 2
done
docker exec -i "$base" psql -X -q -h 127.0.0.1 -p 55432 -U observatorio -d observatorio \
  -v ON_ERROR_STOP=1 -v desde="${DESDE:-1900-01-01}" -At < "$sql" > "$salida"

#!/bin/sh
# Reescribe la base pública SQLite con todos los boletines de la base de ingesta, en una sola transacción.
# Corre dentro de la imagen del exportador (ver Dockerfile), con la red de la base de ingesta.
# Variables: PGHOST, PGUSER, PGDATABASE, PGPASSWORD y BASE_PUBLICA (por defecto /publico/observatorio.db).
set -eu

base=${BASE_PUBLICA:-/publico/observatorio.db}
seleccion=/app/candidatos-genero.csv
version=$(cat /app/version-seleccion)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

psql -X -q -v ON_ERROR_STOP=1 -v desde=1900-01-01 -At -f /app/exportar-proyectos.sql > "$tmp/proyectos.sql"
boletines=$(grep -c '^INSERT INTO proyecto ' "$tmp/proyectos.sql" || true)
if [ "$boletines" -lt 1000 ]; then
  echo "La exportación trajo $boletines boletines; no se reemplaza la base pública." >&2
  exit 1
fi

{
  echo '.bail on'
  echo '.timeout 60000'
  echo 'PRAGMA journal_mode = WAL;'
  cat /app/esquema.sql
  echo 'BEGIN;'
  echo 'CREATE TEMP TABLE csv_seleccion (boletin, anio, iniciativa, titulo, nivel_senal, densidad_cuerpo_10k, titulo_sin_respaldo_en_texto, numero_ley, codificador);'
  echo ".import --csv --skip 1 --schema temp $seleccion csv_seleccion"
  echo 'DELETE FROM seleccion_genero;'
  echo "INSERT OR REPLACE INTO seleccion_genero (boletin, nivel_senal, version) SELECT boletin, nivel_senal, '$version' FROM temp.csv_seleccion;"
  cat "$tmp/proyectos.sql"
  echo 'COMMIT;'
  echo 'PRAGMA wal_checkpoint(TRUNCATE);'
} | sqlite3 "$base" > /dev/null

echo "base pública actualizada: $boletines boletines, selección $version"

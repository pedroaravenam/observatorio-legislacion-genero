#!/bin/sh
# Reescribe la base pública SQLite con todos los boletines de la base de ingesta, en una sola transacción.
# Corre dentro de la imagen del exportador (ver Dockerfile), con la red de la base de ingesta.
# Variables: PGHOST, PGUSER, PGDATABASE, PGPASSWORD y BASE_PUBLICA (por defecto /publico/observatorio.db).
set -eu

base=${BASE_PUBLICA:-/publico/observatorio.db}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

psql -X -q -v ON_ERROR_STOP=1 -v desde=1900-01-01 -At -f /app/exportar-proyectos.sql > "$tmp/proyectos.sql"

# La selección sale de la base de ingesta (tabla clasificacion_genero): INSERT de SQLite, uno por línea.
psql -X -q -v ON_ERROR_STOP=1 -At -c "
  SELECT format('INSERT INTO seleccion_genero (boletin, grupo, nivel_senal, version, codificador, confianza, motivo) VALUES (%L, %L, %L, %L, %L, %L, %L);',
                boletin, grupo, nivel_senal, version, codificador, confianza,
                regexp_replace(motivo, '[\r\n]+', ' ', 'g'))
  FROM clasificacion_genero c
  WHERE incluye AND nivel_senal IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM validacion_genero v WHERE v.boletin = c.boletin AND v.estado = 'pendiente')
  ORDER BY boletin" > "$tmp/seleccion.sql"
selecc=$(grep -c '^INSERT INTO seleccion_genero ' "$tmp/seleccion.sql" || true)
if [ "$selecc" -lt 1000 ]; then
  echo "La selección trajo $selecc boletines; no se reemplaza la base pública." >&2
  exit 1
fi
boletines=$(grep -c '^INSERT INTO proyecto ' "$tmp/proyectos.sql" || true)
if [ "$boletines" -lt 1000 ]; then
  echo "La exportación trajo $boletines boletines; no se reemplaza la base pública." >&2
  exit 1
fi

/app/actualizar-esquema.sh "$base"

{
  echo '.bail on'
  echo '.timeout 60000'
  echo 'PRAGMA journal_mode = WAL;'
  cat /app/esquema.sql
  echo 'BEGIN;'
  cat /app/esquema-seleccion.sql
  cat "$tmp/seleccion.sql"
  cat "$tmp/proyectos.sql"
  echo 'COMMIT;'
  echo 'PRAGMA wal_checkpoint(TRUNCATE);'
} | sqlite3 "$base" > /dev/null

echo "base pública actualizada: $boletines boletines, $selecc en la selección"

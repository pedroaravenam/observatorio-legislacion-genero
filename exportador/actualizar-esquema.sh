#!/bin/sh
# Lleva una base pública SQLite ya publicada al esquema vigente. `CREATE TABLE IF NOT EXISTS` no agrega columnas
# a una tabla que existe, así que cada columna nueva de `proyecto` se agrega aquí, solo si falta.
# Uso: actualizar-esquema.sh <base.db>
set -eu
base=$1
[ -e "$base" ] || exit 0
[ "$(sqlite3 "$base" "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'proyecto'")" = 1 ] || exit 0
if [ "$(sqlite3 "$base" "SELECT count(*) FROM pragma_table_info('proyecto') WHERE name = 'verificado'")" = 0 ]; then
  sqlite3 "$base" "ALTER TABLE proyecto ADD COLUMN verificado TEXT"
  echo "esquema actualizado: columna proyecto.verificado agregada"
fi

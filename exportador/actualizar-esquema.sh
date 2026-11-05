#!/bin/sh
# Lleva una base pública SQLite ya publicada al esquema vigente. `CREATE TABLE IF NOT EXISTS` no agrega columnas
# a una tabla que existe, así que cada columna nueva de `proyecto` se agrega aquí, solo si falta. Debe coincidir con
# esquema.sql. Uso: actualizar-esquema.sh <base.db>
set -eu
base=$1
[ -e "$base" ] || exit 0
[ "$(sqlite3 "$base" "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'proyecto'")" = 1 ] || exit 0

agregar() {
  if [ "$(sqlite3 "$base" "SELECT count(*) FROM pragma_table_info('proyecto') WHERE name = '$1'")" = 0 ]; then
    sqlite3 "$base" "ALTER TABLE proyecto ADD COLUMN $1 $2"
    echo "esquema actualizado: columna proyecto.$1 agregada"
  fi
}
agregar verificado "TEXT"
agregar autoria "TEXT NOT NULL DEFAULT 'sin_dato'"
agregar autores_detalle "TEXT NOT NULL DEFAULT '[]'"
